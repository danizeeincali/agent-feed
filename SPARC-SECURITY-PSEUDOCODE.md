# SPARC Phase 2: Pseudocode Design
**Date:** 2025-10-13

---

## 1. Backend: Protected Path Middleware

```pseudocode
FUNCTION protectCriticalPaths(request, response, next):
  // Define protected directory patterns
  CONST protectedPaths = [
    "/workspaces/agent-feed/prod/",
    "/workspaces/agent-feed/node_modules/",
    "/workspaces/agent-feed/.git/",
    "/workspaces/agent-feed/database.db",
    "/workspaces/agent-feed/data/agent-pages.db"
  ]

  // Convert request body to string for pattern matching
  CONST bodyString = JSON.stringify(request.body)

  // Check if body contains any protected paths
  FOR EACH protectedPath IN protectedPaths:
    IF bodyString.includes(protectedPath):
      LOG_SECURITY_ALERT("PROTECTED_PATH_ACCESS_ATTEMPT", {
        ip: request.ip,
        path: protectedPath,
        url: request.url
      })

      RETURN response.status(403).json({
        error: "Forbidden",
        message: "Access to protected system directories is not allowed",
        protectedPath: protectedPath
      })
    END IF
  END FOR

  // No protected paths found, continue
  next()
END FUNCTION


FUNCTION removeAggressiveSecurity():
  // In server.js, comment out:
  // - Line 178: app.use(security.sanitizeInputs)
  // - Any preventSQLInjection middleware
  // - Any preventXSS middleware

  // Keep:
  // - Rate limiting (globalRateLimiter, speedLimiter)
  // - CORS
  // - Helmet security headers
  // - Request size limits
  // - Authentication middleware
END FUNCTION
```

---

## 2. Frontend: Warning Dialog Detection

```pseudocode
FUNCTION detectRiskyContent(postContent, postTitle):
  CONST riskyPatterns = {
    filePaths: [
      "/workspaces/",
      "/prod/",
      "/tmp/",
      "~/",
      "C:\\",
      "/etc/",
      "/var/"
    ],

    shellCommands: [
      "rm ",
      "mv ",
      "cp ",
      "sudo ",
      "chmod ",
      "chown ",
      "kill ",
      "pkill ",
      "systemctl ",
      "service "
    ],

    destructiveKeywords: [
      "delete file",
      "remove file",
      "destroy ",
      "drop table",
      "drop database"
    ]
  }

  CONST contentToCheck = postContent + " " + postTitle

  // Check file paths
  FOR EACH pattern IN riskyPatterns.filePaths:
    IF contentToCheck.includes(pattern):
      RETURN {
        isRisky: true,
        reason: "filesystem_path",
        pattern: pattern
      }
    END IF
  END FOR

  // Check shell commands
  FOR EACH pattern IN riskyPatterns.shellCommands:
    IF contentToCheck.includes(pattern):
      RETURN {
        isRisky: true,
        reason: "shell_command",
        pattern: pattern
      }
    END IF
  END FOR

  // Check destructive keywords
  FOR EACH pattern IN riskyPatterns.destructiveKeywords:
    IF contentToCheck.toLowerCase().includes(pattern.toLowerCase()):
      RETURN {
        isRisky: true,
        reason: "destructive_operation",
        pattern: pattern
      }
    END IF
  END FOR

  RETURN {
    isRisky: false,
    reason: null,
    pattern: null
  }
END FUNCTION
```

---

## 3. Frontend: Warning Dialog Component

```pseudocode
COMPONENT SystemCommandWarningDialog(props):
  PROPS:
    - isOpen: boolean
    - onCancel: function
    - onContinue: function
    - detectedPattern: string
    - reason: string

  FUNCTION render():
    IF NOT isOpen:
      RETURN null
    END IF

    RETURN Modal(
      title: "⚠️ System Operation Detected",

      content: (
        <div>
          <p>Your post contains what appears to be a system command or file path:</p>
          <code>{detectedPattern}</code>

          <div className="warning-box">
            <h4>Are you asking Avi to perform actions on your system?</h4>
            <ul>
              <li>File operations (create, delete, modify)</li>
              <li>Shell commands</li>
              <li>System configuration changes</li>
            </ul>
          </div>

          <p className="disclaimer">
            <strong>Note:</strong> Protected directories like /prod/, /node_modules/,
            and /.git/ are automatically blocked.
          </p>
        </div>
      ),

      actions: (
        <div>
          <Button
            variant="secondary"
            onClick={onCancel}
            autoFocus={true}
          >
            Cancel
          </Button>

          <Button
            variant="warning"
            onClick={onContinue}
          >
            Continue Anyway
          </Button>
        </div>
      )
    )
  END FUNCTION
END COMPONENT
```

---

## 4. Frontend: Toast Notification System

```pseudocode
COMPONENT ToastNotification(props):
  PROPS:
    - type: "success" | "error" | "warning" | "info"
    - message: string
    - duration: number (default: 5000ms)
    - onDismiss: function

  STATE:
    - isVisible: boolean = true

  FUNCTION componentDidMount():
    IF props.type !== "error":
      // Auto-dismiss after duration
      setTimeout(() => {
        isVisible = false
        props.onDismiss()
      }, props.duration)
    END IF
  END FUNCTION

  FUNCTION render():
    IF NOT isVisible:
      RETURN null
    END IF

    CONST icon = {
      success: "✓",
      error: "✗",
      warning: "⚠️",
      info: "ℹ"
    }

    RETURN (
      <div className={`toast toast-${props.type}`}>
        <span className="toast-icon">{icon[props.type]}</span>
        <span className="toast-message">{props.message}</span>
        <button onClick={() => isVisible = false}>×</button>
      </div>
    )
  END FUNCTION
END COMPONENT


HOOK useToast():
  STATE:
    - toasts: Array<Toast> = []

  FUNCTION showToast(type, message, duration):
    CONST newToast = {
      id: generateUniqueId(),
      type: type,
      message: message,
      duration: duration || 5000
    }

    toasts = [...toasts, newToast]
  END FUNCTION

  FUNCTION dismissToast(toastId):
    toasts = toasts.filter(t => t.id !== toastId)
  END FUNCTION

  RETURN {
    toasts,
    showToast,
    dismissToast,

    // Convenience methods
    showSuccess: (msg) => showToast("success", msg, 5000),
    showError: (msg) => showToast("error", msg, 0), // 0 = no auto-dismiss
    showWarning: (msg) => showToast("warning", msg, 7000),
    showInfo: (msg) => showToast("info", msg, 5000)
  }
END HOOK
```

---

## 5. Frontend: Enhanced Posting Interface Integration

```pseudocode
COMPONENT QuickPostSection(props):
  STATE:
    - content: string = ""
    - isSubmitting: boolean = false
    - showWarningDialog: boolean = false
    - detectedRisk: Object | null = null

  CONST toast = useToast()

  FUNCTION handleSubmit(event):
    event.preventDefault()

    IF content.isEmpty():
      RETURN
    END IF

    // Check for risky content
    CONST riskCheck = detectRiskyContent(content, content.slice(0, 50))

    IF riskCheck.isRisky:
      // Show warning dialog
      detectedRisk = riskCheck
      showWarningDialog = true
      toast.showWarning("Review system operation request")
      RETURN
    END IF

    // No risk detected, proceed with post
    submitPost()
  END FUNCTION


  FUNCTION submitPost():
    isSubmitting = true

    TRY:
      CONST response = await fetch("/api/v1/agent-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: content.slice(0, 50),
          content: content,
          author_agent: "user-agent"
        })
      })

      IF response.ok:
        CONST result = await response.json()

        // Show success toast
        toast.showSuccess(`Post created successfully! ID: ${result.data.id}`)

        // Clear content
        content = ""

        // Call parent callback
        props.onPostCreated(result.data)
      ELSE:
        // Handle error response
        CONST error = await response.json()

        // Show error toast
        toast.showError(error.message || "Failed to create post")
      END IF

    CATCH error:
      // Network or parsing error
      toast.showError("Network error: Could not create post")
      console.error(error)

    FINALLY:
      isSubmitting = false
    END TRY
  END FUNCTION


  FUNCTION handleWarningCancel():
    showWarningDialog = false
    detectedRisk = null
    toast.showInfo("Post cancelled")
  END FUNCTION


  FUNCTION handleWarningContinue():
    showWarningDialog = false
    detectedRisk = null

    // User confirmed, proceed with post
    submitPost()
  END FUNCTION


  FUNCTION render():
    RETURN (
      <div>
        <form onSubmit={handleSubmit}>
          <textarea
            value={content}
            onChange={(e) => content = e.target.value}
            placeholder="What's on your mind?"
          />

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Posting..." : "Post"}
          </button>
        </form>

        <SystemCommandWarningDialog
          isOpen={showWarningDialog}
          detectedPattern={detectedRisk?.pattern}
          reason={detectedRisk?.reason}
          onCancel={handleWarningCancel}
          onContinue={handleWarningContinue}
        />
      </div>
    )
  END FUNCTION
END COMPONENT
```

---

## 6. Test Pseudocode

```pseudocode
TEST_SUITE "Protected Path Middleware":

  TEST "blocks /prod/ path":
    CONST response = POST("/api/v1/agent-posts", {
      title: "Test",
      content: "Write to /workspaces/agent-feed/prod/test.txt"
    })

    ASSERT response.status === 403
    ASSERT response.body.error === "Forbidden"
    ASSERT response.body.protectedPath.includes("/prod/")
  END TEST


  TEST "allows non-protected paths":
    CONST response = POST("/api/v1/agent-posts", {
      title: "Test",
      content: "Create /workspaces/agent-feed/frontend/test.txt"
    })

    ASSERT response.status === 201
    ASSERT response.body.success === true
  END TEST


  TEST "allows posts with 'create' keyword":
    CONST response = POST("/api/v1/agent-posts", {
      title: "I want to create a feature",
      content: "Let's create something amazing"
    })

    ASSERT response.status === 201
    ASSERT response.body.success === true
  END TEST
END TEST_SUITE


TEST_SUITE "Warning Dialog Detection":

  TEST "detects filesystem paths":
    CONST result = detectRiskyContent(
      "Create /workspaces/test.txt",
      "File operation"
    )

    ASSERT result.isRisky === true
    ASSERT result.reason === "filesystem_path"
  END TEST


  TEST "detects shell commands":
    CONST result = detectRiskyContent(
      "Run rm -rf /tmp/old",
      "Cleanup"
    )

    ASSERT result.isRisky === true
    ASSERT result.reason === "shell_command"
  END TEST


  TEST "allows normal posts":
    CONST result = detectRiskyContent(
      "This is a normal post about coding",
      "Normal post"
    )

    ASSERT result.isRisky === false
  END TEST
END TEST_SUITE
```

---

**Pseudocode Complete - Ready for Architecture Phase**
