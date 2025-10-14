# SPARC Security Inverted Model - Phase 2: Pseudocode

**Date:** 2025-10-13
**Status:** Phase 2 - Pseudocode
**Methodology:** SPARC + NLD + TDD
**Previous Phase:** SPARC-SECURITY-INVERTED-SPEC.md

---

## Executive Summary

This document provides the detailed pseudocode and algorithm design for the inverted protection model. The core change is moving from a block-list (deny specific paths) to an **allow-list** (allow only /prod/, deny everything else).

---

## 1. Backend Middleware Pseudocode

### 1.1 Main Protection Function

```pseudocode
FUNCTION protectCriticalPaths(request, response, next):
    // Early exit for read operations
    IF request.method IN ['GET', 'HEAD', 'OPTIONS']:
        RETURN next()  // Skip protection for read operations
    END IF

    // Extract request body as string for pattern matching
    TRY:
        bodyString = JSON.stringify(request.body).toLowerCase()
    CATCH error:
        // Fail-open: If can't parse body, allow through
        logError('Failed to parse request body for protection check', error)
        RETURN next()
    END TRY

    // Extract all filesystem paths from body
    detectedPaths = extractFilesystemPaths(bodyString)

    // If no filesystem paths detected, allow through
    IF detectedPaths.isEmpty():
        RETURN next()
    END IF

    // Check each detected path
    FOR EACH path IN detectedPaths:
        // Normalize path for comparison
        normalizedPath = path.toLowerCase().trim()

        // Check if path is under our workspace
        IF NOT normalizedPath.startsWith('/workspaces/agent-feed/'):
            CONTINUE  // Not our concern, skip to next path
        END IF

        // --- ALLOW-LIST CHECK ---
        // Check if path is in the allowed zone (/prod/)
        IF normalizedPath.startsWith('/workspaces/agent-feed/prod/'):
            // Path is in /prod/, check if it's a protected file
            protectedFileCheck = checkProtectedFileInProd(normalizedPath)

            IF protectedFileCheck.isProtected:
                // Block: Protected file within /prod/
                logSecurityAlert(request, normalizedPath, 'protected_file')
                RETURN response.status(403).json({
                    success: false,
                    error: 'Forbidden',
                    message: protectedFileCheck.errorMessage,
                    blockedPath: normalizedPath,
                    reason: 'file_protected',
                    protectedFiles: PROTECTED_FILES_IN_PROD,
                    safeZone: '/workspaces/agent-feed/prod/agent_workspace/',
                    hint: 'This file is protected to prevent breaking the application.',
                    tip: 'You can work freely in /prod/agent_workspace/ without restrictions.'
                })
            END IF

            // Check if in completely unrestricted safe zone
            IF normalizedPath.startsWith('/workspaces/agent-feed/prod/agent_workspace/'):
                // Completely safe - no restrictions
                CONTINUE  // Allow this path, check next
            END IF

            // In /prod/ but not protected file and not agent_workspace
            // Still allowed, just log for audit
            logInfo('Access to /prod/ file (allowed)', normalizedPath)
            CONTINUE  // Allow this path, check next

        ELSE:
            // --- BLOCK: Not in allowed zone ---
            // Path is under /workspaces/agent-feed/ but NOT in /prod/
            // This means it's a sibling directory (frontend, api-server, src, etc.)

            siblingDirCheck = identifySiblingDirectory(normalizedPath)

            logSecurityAlert(request, normalizedPath, 'blocked_directory')
            RETURN response.status(403).json({
                success: false,
                error: 'Forbidden',
                message: `Access denied: ${siblingDirCheck.directoryName} is read-only`,
                blockedPath: normalizedPath,
                reason: 'directory_protected',
                blockedDirectory: siblingDirCheck.directoryName,
                allowedPaths: ['/workspaces/agent-feed/prod/ (except protected files)'],
                safeZone: '/workspaces/agent-feed/prod/agent_workspace/',
                hint: 'Only the /prod/ directory is writable. All other directories are read-only.',
                tip: 'To work freely, use paths like: /workspaces/agent-feed/prod/agent_workspace/your-file.txt'
            })
        END IF
    END FOR

    // All paths checked and allowed
    RETURN next()
END FUNCTION
```

### 1.2 Extract Filesystem Paths

```pseudocode
FUNCTION extractFilesystemPaths(bodyString):
    // Pattern to match filesystem paths
    // Matches: /path/to/file, /path/to/directory/, ~/path, ./relative/path
    pathPatterns = [
        '/workspaces/agent-feed/',  // Absolute workspace paths
        '~/agent-feed/',             // Home-relative paths
        './prod/',                   // Relative prod paths
        '../prod/',                  // Parent-relative paths
    ]

    detectedPaths = []

    FOR EACH pattern IN pathPatterns:
        // Find all occurrences of pattern in body
        startIndex = 0
        WHILE true:
            index = bodyString.indexOf(pattern, startIndex)
            IF index == -1:
                BREAK  // No more occurrences
            END IF

            // Extract full path (until space, quote, or end of string)
            pathEnd = findPathEnd(bodyString, index)
            fullPath = bodyString.substring(index, pathEnd)

            // Clean up path (remove trailing quotes, commas, etc.)
            cleanPath = cleanFilesystemPath(fullPath)

            detectedPaths.append(cleanPath)
            startIndex = pathEnd
        END WHILE
    END FOR

    RETURN detectedPaths
END FUNCTION
```

### 1.3 Check Protected File in Prod

```pseudocode
FUNCTION checkProtectedFileInProd(normalizedPath):
    // List of protected files/directories within /prod/
    PROTECTED_FILES_IN_PROD = [
        '/workspaces/agent-feed/prod/package.json',
        '/workspaces/agent-feed/prod/package-lock.json',
        '/workspaces/agent-feed/prod/.env',
        '/workspaces/agent-feed/prod/.git/',
        '/workspaces/agent-feed/prod/node_modules/',
        '/workspaces/agent-feed/prod/.gitignore',
        '/workspaces/agent-feed/prod/tsconfig.json',
        '/workspaces/agent-feed/prod/vite.config.ts',
        '/workspaces/agent-feed/prod/playwright.config.ts',
        '/workspaces/agent-feed/prod/vitest.config.ts',
    ]

    FOR EACH protectedPath IN PROTECTED_FILES_IN_PROD:
        normalizedProtected = protectedPath.toLowerCase()

        // Check exact match or if path is under protected directory
        IF normalizedPath == normalizedProtected OR
           normalizedPath.startsWith(normalizedProtected + '/'):

            fileName = extractFileName(protectedPath)

            RETURN {
                isProtected: true,
                errorMessage: `Access denied: ${fileName} is protected`,
                fileName: fileName,
                fullPath: protectedPath
            }
        END IF
    END FOR

    // Not a protected file
    RETURN {
        isProtected: false,
        errorMessage: null,
        fileName: null,
        fullPath: null
    }
END FUNCTION
```

### 1.4 Identify Sibling Directory

```pseudocode
FUNCTION identifySiblingDirectory(normalizedPath):
    // Known sibling directories at /workspaces/agent-feed/ level
    SIBLING_DIRECTORIES = [
        { pattern: '/workspaces/agent-feed/frontend/', name: 'Frontend source code' },
        { pattern: '/workspaces/agent-feed/api-server/', name: 'Backend API code' },
        { pattern: '/workspaces/agent-feed/src/', name: 'Source code' },
        { pattern: '/workspaces/agent-feed/node_modules/', name: 'Dependencies' },
        { pattern: '/workspaces/agent-feed/.git/', name: 'Version control' },
        { pattern: '/workspaces/agent-feed/data/', name: 'Database files' },
        { pattern: '/workspaces/agent-feed/config/', name: 'Configuration' },
        { pattern: '/workspaces/agent-feed/tests/', name: 'Test files' },
        { pattern: '/workspaces/agent-feed/.github/', name: 'GitHub workflows' },
        { pattern: '/workspaces/agent-feed/.env', name: 'Environment secrets' },
        { pattern: '/workspaces/agent-feed/database.db', name: 'Database file' },
    ]

    FOR EACH directory IN SIBLING_DIRECTORIES:
        IF normalizedPath.startsWith(directory.pattern.toLowerCase()) OR
           normalizedPath == directory.pattern.toLowerCase().trimEnd('/'):
            RETURN {
                directoryName: directory.name,
                pattern: directory.pattern,
                found: true
            }
        END IF
    END FOR

    // Unknown sibling directory - still block it
    // Extract directory name from path
    pathParts = normalizedPath.split('/')
    directoryIndex = 3  // /workspaces/agent-feed/[THIS_PART]/
    IF pathParts.length > directoryIndex:
        dirName = pathParts[directoryIndex]
        RETURN {
            directoryName: `/${dirName}/ directory`,
            pattern: `/workspaces/agent-feed/${dirName}/`,
            found: false
        }
    END IF

    RETURN {
        directoryName: 'Unknown directory',
        pattern: normalizedPath,
        found: false
    }
END FUNCTION
```

### 1.5 Security Logging

```pseudocode
FUNCTION logSecurityAlert(request, path, reason):
    timestamp = getCurrentTimestamp()
    clientIP = getClientIP(request)

    alert = {
        timestamp: timestamp,
        ip: clientIP,
        path: path,
        reason: reason,
        method: request.method,
        endpoint: request.url,
        userAgent: request.headers['user-agent']
    }

    // Store in memory (with cleanup)
    securityAlerts.append(alert)

    // Log to console for immediate visibility
    console.warn('[SECURITY ALERT]', {
        ip: clientIP,
        path: path,
        reason: reason,
        time: timestamp
    })

    // Increment violation counter for this IP
    violationCounts[clientIP] = (violationCounts[clientIP] || 0) + 1

    // Optional: If too many violations, increase response time
    IF violationCounts[clientIP] > 10:
        sleep(1000)  // Rate limiting by delay
    END IF

    // Cleanup old alerts (keep last 1000)
    IF securityAlerts.length > 1000:
        securityAlerts = securityAlerts.slice(-1000)
    END IF
END FUNCTION
```

---

## 2. Frontend Risk Detection Pseudocode

### 2.1 Main Detection Function

```pseudocode
FUNCTION detectRiskyContent(content, title):
    // Combine title and content for checking
    textToCheck = `${title} ${content}`.toLowerCase()

    // --- PRIORITY 1: Check Safe Zone First ---
    // If in safe zone, no warning needed
    IF containsSafeZonePath(textToCheck):
        RETURN {
            isRisky: false,
            reason: null,
            pattern: null,
            description: null,
            category: 'safe_zone'
        }
    END IF

    // --- PRIORITY 2: Check Blocked Directories ---
    blockedDirCheck = checkBlockedDirectories(textToCheck)
    IF blockedDirCheck.found:
        RETURN {
            isRisky: true,
            reason: 'blocked_directory',
            pattern: blockedDirCheck.pattern,
            description: blockedDirCheck.description,
            category: 'directory',
            safeZone: '/workspaces/agent-feed/prod/agent_workspace/'
        }
    END IF

    // --- PRIORITY 3: Check Protected Files in /prod/ ---
    protectedFileCheck = checkProtectedFilesInProd(textToCheck)
    IF protectedFileCheck.found:
        RETURN {
            isRisky: true,
            reason: 'protected_file',
            pattern: protectedFileCheck.pattern,
            description: protectedFileCheck.description,
            category: 'file',
            safeZone: '/workspaces/agent-feed/prod/agent_workspace/'
        }
    END IF

    // --- PRIORITY 4: Check Shell Commands ---
    shellCommandCheck = checkShellCommands(textToCheck)
    IF shellCommandCheck.found:
        RETURN {
            isRisky: true,
            reason: 'shell_command',
            pattern: shellCommandCheck.pattern,
            description: shellCommandCheck.description,
            category: 'command',
            safeZone: '/workspaces/agent-feed/prod/agent_workspace/'
        }
    END IF

    // --- PRIORITY 5: Check Destructive Keywords ---
    destructiveCheck = checkDestructiveKeywords(textToCheck)
    IF destructiveCheck.found:
        RETURN {
            isRisky: true,
            reason: 'destructive_keyword',
            pattern: destructiveCheck.pattern,
            description: destructiveCheck.description,
            category: 'keyword',
            safeZone: '/workspaces/agent-feed/prod/agent_workspace/'
        }
    END IF

    // No risks detected
    RETURN {
        isRisky: false,
        reason: null,
        pattern: null,
        description: null,
        category: null
    }
END FUNCTION
```

### 2.2 Check Safe Zone

```pseudocode
FUNCTION containsSafeZonePath(textToCheck):
    SAFE_ZONE_PATTERNS = [
        '/workspaces/agent-feed/prod/agent_workspace/',
        '/prod/agent_workspace/',
        'prod/agent_workspace/',
    ]

    FOR EACH pattern IN SAFE_ZONE_PATTERNS:
        IF textToCheck.includes(pattern.toLowerCase()):
            RETURN true
        END IF
    END FOR

    RETURN false
END FUNCTION
```

### 2.3 Check Blocked Directories

```pseudocode
FUNCTION checkBlockedDirectories(textToCheck):
    BLOCKED_DIRECTORIES = [
        {
            pattern: '/workspaces/agent-feed/frontend/',
            shortPattern: '/frontend/',
            description: 'Frontend source code (read-only)',
            name: 'Frontend'
        },
        {
            pattern: '/workspaces/agent-feed/api-server/',
            shortPattern: '/api-server/',
            description: 'Backend API code (read-only)',
            name: 'Backend'
        },
        {
            pattern: '/workspaces/agent-feed/src/',
            shortPattern: '/src/',
            description: 'Source code (read-only)',
            name: 'Source'
        },
        {
            pattern: '/workspaces/agent-feed/node_modules/',
            shortPattern: '/node_modules/',
            description: 'Dependencies (read-only)',
            name: 'Dependencies'
        },
        {
            pattern: '/workspaces/agent-feed/.git/',
            shortPattern: '/.git/',
            description: 'Version control (read-only)',
            name: 'Git'
        },
        {
            pattern: '/workspaces/agent-feed/data/',
            shortPattern: '/data/',
            description: 'Database files (read-only)',
            name: 'Data'
        },
        {
            pattern: '/workspaces/agent-feed/config/',
            shortPattern: '/config/',
            description: 'Configuration (read-only)',
            name: 'Config'
        },
    ]

    FOR EACH directory IN BLOCKED_DIRECTORIES:
        // Check full pattern first
        IF textToCheck.includes(directory.pattern.toLowerCase()):
            RETURN {
                found: true,
                pattern: directory.pattern,
                description: directory.description,
                name: directory.name
            }
        END IF

        // Check short pattern (but avoid false positives)
        // Only match if it looks like a path (has / before and after)
        IF containsPathPattern(textToCheck, directory.shortPattern):
            RETURN {
                found: true,
                pattern: directory.shortPattern,
                description: directory.description,
                name: directory.name
            }
        END IF
    END FOR

    RETURN { found: false }
END FUNCTION
```

### 2.4 Check Protected Files in Prod

```pseudocode
FUNCTION checkProtectedFilesInProd(textToCheck):
    PROTECTED_FILES = [
        {
            pattern: '/workspaces/agent-feed/prod/package.json',
            shortPattern: 'prod/package.json',
            description: 'Package manifest (protected)',
            name: 'package.json'
        },
        {
            pattern: '/workspaces/agent-feed/prod/.env',
            shortPattern: 'prod/.env',
            description: 'Environment secrets (protected)',
            name: '.env'
        },
        {
            pattern: '/workspaces/agent-feed/prod/.git/',
            shortPattern: 'prod/.git',
            description: 'Version control in prod (protected)',
            name: '.git'
        },
        {
            pattern: '/workspaces/agent-feed/prod/node_modules/',
            shortPattern: 'prod/node_modules',
            description: 'Dependencies in prod (protected)',
            name: 'node_modules'
        },
        {
            pattern: '/workspaces/agent-feed/prod/package-lock.json',
            shortPattern: 'prod/package-lock.json',
            description: 'Lock file (protected)',
            name: 'package-lock.json'
        },
        {
            pattern: '/workspaces/agent-feed/prod/tsconfig.json',
            shortPattern: 'prod/tsconfig.json',
            description: 'TypeScript config (protected)',
            name: 'tsconfig.json'
        },
    ]

    FOR EACH file IN PROTECTED_FILES:
        IF textToCheck.includes(file.pattern.toLowerCase()) OR
           textToCheck.includes(file.shortPattern.toLowerCase()):
            RETURN {
                found: true,
                pattern: file.pattern,
                description: file.description,
                name: file.name
            }
        END IF
    END FOR

    RETURN { found: false }
END FUNCTION
```

### 2.5 Prevent False Positives

```pseudocode
FUNCTION containsPathPattern(text, pattern):
    // Ensure pattern looks like a path (not just a word)
    // Must have path separators around it

    pattern = pattern.toLowerCase()
    index = text.indexOf(pattern)

    IF index == -1:
        RETURN false
    END IF

    // Check character before pattern
    IF index > 0:
        charBefore = text[index - 1]
        // Must be space, quote, or path separator
        IF NOT charBefore IN [' ', '"', "'", '/', '\\', '\n', '\t']:
            RETURN false  // False positive: part of a word
        END IF
    END IF

    // Check character after pattern
    endIndex = index + pattern.length
    IF endIndex < text.length:
        charAfter = text[endIndex]
        // Must be space, quote, path separator, or punctuation
        IF NOT charAfter IN [' ', '"', "'", '/', '\\', '\n', '\t', ',', '.', '!', '?']:
            RETURN false  // False positive: part of a word
        END IF
    END IF

    RETURN true  // Legitimate path pattern
END FUNCTION
```

---

## 3. Warning Dialog Pseudocode

### 3.1 Dialog Message Generation

```pseudocode
FUNCTION generateDialogMessage(reason, pattern, description):
    IF reason == 'blocked_directory':
        RETURN {
            title: '⚠️ Protected Directory Detected',
            message: `You're trying to access: ${pattern}\n\n` +
                    'This directory is read-only to protect application code.\n\n' +
                    'Safe Zone: /workspaces/agent-feed/prod/\n' +
                    'You can work freely in: /workspaces/agent-feed/prod/agent_workspace/',
            severity: 'warning',
            icon: 'folder-lock'
        }

    ELSE IF reason == 'protected_file':
        fileName = extractFileName(pattern)
        RETURN {
            title: '⚠️ Protected File Detected',
            message: `You're trying to modify: ${fileName}\n\n` +
                    'This file is protected to prevent breaking the application.\n\n' +
                    'Safe Zone: /workspaces/agent-feed/prod/agent_workspace/\n' +
                    'All files in agent_workspace/ can be modified without restrictions.',
            severity: 'warning',
            icon: 'file-lock'
        }

    ELSE IF reason == 'shell_command':
        RETURN {
            title: '⚠️ System Command Detected',
            message: `You're using a potentially destructive command: ${pattern}\n\n` +
                    'This could delete or modify important files if used incorrectly.\n\n' +
                    'Tip: Use specific paths in /workspaces/agent-feed/prod/agent_workspace/\n' +
                    'to safely create/modify files.',
            severity: 'caution',
            icon: 'terminal'
        }

    ELSE:
        RETURN {
            title: '⚠️ Potentially Risky Operation',
            message: description || 'This operation may affect system files.',
            severity: 'info',
            icon: 'alert'
        }
    END IF
END FUNCTION
```

### 3.2 Dialog Event Handlers

```pseudocode
FUNCTION handleDialogCancel():
    // User clicked Cancel button
    closeDialog()
    showInfoToast('Post cancelled - operation not performed')
    clearPostForm()  // Optional: keep content for editing
END FUNCTION

FUNCTION handleDialogContinue():
    // User clicked Continue Anyway button
    closeDialog()
    showWarningToast('Submitting post - backend will validate')
    submitPostToBackend()  // Backend will do final check
END FUNCTION

FUNCTION handleDialogEscape(event):
    // User pressed Escape key
    IF event.key == 'Escape':
        handleDialogCancel()
    END IF
END FUNCTION
```

---

## 4. Toast Notification Pseudocode

### 4.1 Toast Queue Management

```pseudocode
FUNCTION showToast(type, message, duration):
    toastId = generateUniqueId()

    toast = {
        id: toastId,
        type: type,  // 'success', 'error', 'warning', 'info'
        message: message,
        duration: duration,
        timestamp: getCurrentTimestamp()
    }

    // Add to queue
    toastQueue.append(toast)

    // Enforce max 5 toasts (FIFO)
    IF toastQueue.length > 5:
        oldestToast = toastQueue[0]
        dismissToast(oldestToast.id)
        toastQueue = toastQueue.slice(1)
    END IF

    // Render toast
    renderToast(toast)

    // Auto-dismiss if duration > 0
    IF duration > 0:
        setTimeout(() => {
            dismissToast(toastId)
        }, duration)
    END IF

    RETURN toastId
END FUNCTION
```

### 4.2 Toast Type Helpers

```pseudocode
FUNCTION showSuccess(message, duration = 5000):
    RETURN showToast('success', message, duration)
END FUNCTION

FUNCTION showError(message, duration = 0):
    // Errors don't auto-dismiss (duration = 0)
    RETURN showToast('error', message, duration)
END FUNCTION

FUNCTION showWarning(message, duration = 7000):
    RETURN showToast('warning', message, duration)
END FUNCTION

FUNCTION showInfo(message, duration = 5000):
    RETURN showToast('info', message, duration)
END FUNCTION
```

---

## 5. Integration Flow Pseudocode

### 5.1 Post Submission Flow

```pseudocode
FUNCTION handlePostSubmit(content, title):
    // Step 1: Frontend risk detection
    riskCheck = detectRiskyContent(content, title)

    IF riskCheck.isRisky:
        // Step 2: Show warning dialog
        dialogMessage = generateDialogMessage(
            riskCheck.reason,
            riskCheck.pattern,
            riskCheck.description
        )

        showWarningDialog(dialogMessage, {
            onCancel: () => {
                showInfo('Post cancelled')
            },
            onContinue: () => {
                submitToBackend(content, title)
            }
        })
    ELSE:
        // No risk detected, submit directly
        submitToBackend(content, title)
    END IF
END FUNCTION
```

### 5.2 Backend Submission

```pseudocode
FUNCTION submitToBackend(content, title):
    showLoadingState()

    TRY:
        response = await POST('/api/v1/agent-posts', {
            title: title,
            content: content,
            agent_id: 'avi',
            published_at: getCurrentTimestamp()
        })

        IF response.ok:
            data = await response.json()
            showSuccess(`✓ Post created successfully! (ID: ${data.post.id})`)
            clearPostForm()
            refreshFeed()
        ELSE:
            errorData = await response.json()

            IF response.status == 403:
                // Backend blocked - show helpful error
                message = errorData.hint || errorData.message
                showError(`Access denied: ${message}`)
            ELSE:
                showError(`Failed to create post: ${errorData.message}`)
            END IF
        END IF

    CATCH error:
        showError(`Network error: ${error.message}`)
    FINALLY:
        hideLoadingState()
    END TRY
END FUNCTION
```

---

## 6. Edge Cases and Error Handling

### 6.1 Edge Case: Multiple Paths in One Post

```pseudocode
FUNCTION handleMultiplePaths(detectedPaths):
    // If multiple paths detected, check in priority order:
    // 1. Protected files (highest priority)
    // 2. Blocked directories
    // 3. Safe zone paths (lowest priority)

    protectedFiles = []
    blockedDirs = []
    safePaths = []

    FOR EACH path IN detectedPaths:
        IF isProtectedFile(path):
            protectedFiles.append(path)
        ELSE IF isBlockedDirectory(path):
            blockedDirs.append(path)
        ELSE IF isSafeZone(path):
            safePaths.append(path)
        END IF
    END FOR

    // Block on first protected file
    IF protectedFiles.length > 0:
        RETURN blockWithError('protected_file', protectedFiles[0])
    END IF

    // Block on first blocked directory
    IF blockedDirs.length > 0:
        RETURN blockWithError('blocked_directory', blockedDirs[0])
    END IF

    // All paths are safe
    RETURN allow()
END FUNCTION
```

### 6.2 Edge Case: Case Insensitivity

```pseudocode
FUNCTION normalizePath(path):
    // Always convert to lowercase for comparison
    normalized = path.toLowerCase()

    // Remove trailing slashes for consistency
    normalized = normalized.trimEnd('/')

    // Handle Windows-style paths
    normalized = normalized.replace('\\', '/')

    RETURN normalized
END FUNCTION
```

### 6.3 Edge Case: Relative Paths

```pseudocode
FUNCTION resolveRelativePath(relativePath, currentDir):
    // Handle relative paths like ../prod/ or ./agent_workspace/

    IF relativePath.startsWith('./'):
        // Current directory relative
        resolved = currentDir + '/' + relativePath.slice(2)
    ELSE IF relativePath.startsWith('../'):
        // Parent directory relative
        parentDir = getParentDirectory(currentDir)
        resolved = parentDir + '/' + relativePath.slice(3)
    ELSE IF relativePath.startsWith('~/'):
        // Home directory relative
        resolved = '/workspaces/agent-feed/' + relativePath.slice(2)
    ELSE:
        // Absolute path
        resolved = relativePath
    END IF

    RETURN normalized(resolved)
END FUNCTION
```

### 6.4 Edge Case: Malformed Requests

```pseudocode
FUNCTION handleMalformedRequest(request):
    TRY:
        body = JSON.parse(request.body)
    CATCH error:
        // Can't parse JSON - fail open (allow through)
        logError('Malformed JSON in request', error)
        RETURN next()  // Allow through, don't block on parse errors
    END TRY

    // Check if body has expected structure
    IF body == null OR typeof body != 'object':
        logWarning('Unexpected body structure', body)
        RETURN next()  // Fail open
    END IF

    // Continue with normal checking
    RETURN checkPaths(body)
END FUNCTION
```

---

## 7. Performance Optimizations

### 7.1 Early Exit Strategies

```pseudocode
// Optimization 1: Skip read operations immediately
IF request.method IN ['GET', 'HEAD', 'OPTIONS']:
    RETURN next()  // <1ms
END IF

// Optimization 2: Quick check for filesystem paths
IF NOT bodyString.includes('/workspaces/'):
    RETURN next()  // No paths to check, <1ms
END IF

// Optimization 3: Cache compiled regex patterns
STATIC pathRegex = compileRegex(PATH_PATTERN)  // Compile once

// Optimization 4: Use indexOf instead of regex when possible
IF bodyString.indexOf('/workspaces/agent-feed/prod/agent_workspace/') != -1:
    // Safe zone found immediately
END IF
```

### 7.2 Caching Strategy

```pseudocode
// Cache check results for identical requests (optional)
STATIC requestCache = new LRUCache(maxSize: 100, ttl: 60000)  // 1 minute TTL

FUNCTION protectCriticalPaths(request):
    cacheKey = hashRequest(request.body)

    cached = requestCache.get(cacheKey)
    IF cached != null:
        IF cached.allowed:
            RETURN next()
        ELSE:
            RETURN response.status(403).json(cached.error)
        END IF
    END IF

    // Perform actual check
    result = checkPathsDetailed(request)

    // Cache result
    requestCache.set(cacheKey, result)

    RETURN result
END FUNCTION
```

---

## 8. Testing Pseudocode

### 8.1 Test Case Structure

```pseudocode
TEST 'Allow /prod/ general access':
    request = createPostRequest({
        content: 'Create file at /workspaces/agent-feed/prod/test.txt'
    })

    response = await protectCriticalPaths(request)

    ASSERT response.status == 200
    ASSERT response.allowed == true
END TEST

TEST 'Block /frontend/ directory':
    request = createPostRequest({
        content: 'Modify /workspaces/agent-feed/frontend/component.tsx'
    })

    response = await protectCriticalPaths(request)

    ASSERT response.status == 403
    ASSERT response.body.reason == 'directory_protected'
    ASSERT response.body.blockedPath.includes('frontend')
    ASSERT response.body.hint.includes('prod/agent_workspace')
END TEST

TEST 'Block protected file in /prod/':
    request = createPostRequest({
        content: 'Update /workspaces/agent-feed/prod/package.json'
    })

    response = await protectCriticalPaths(request)

    ASSERT response.status == 403
    ASSERT response.body.reason == 'file_protected'
    ASSERT response.body.protectedFiles.includes('package.json')
END TEST
```

---

## 9. Algorithm Complexity Analysis

### 9.1 Time Complexity

```
Main Protection Function: O(n * m)
- n = number of paths in request body
- m = number of patterns to check

Optimization brings to: O(n)
- Early exits reduce checks
- indexOf is O(n) for string length
- Most requests exit early (GET, no paths)

Worst case: O(100)
- Max 100 paths per request (reasonable limit)
- Each path check is O(1) with indexOf

Average case: O(1)
- Most requests are GET (skip immediately)
- Most POST requests have 0-1 paths
```

### 9.2 Space Complexity

```
Memory Usage:
- PROTECTED_FILES array: O(10) = constant
- BLOCKED_DIRECTORIES array: O(10) = constant
- Security logs: O(1000) = bounded
- Request cache (optional): O(100) = bounded

Total: O(1) - constant space
```

---

**END OF PSEUDOCODE - PHASE 2 COMPLETE**

**Next Phase:** Create SPARC-SECURITY-INVERTED-ARCHITECTURE.md
