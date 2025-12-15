# SPARC Specification: Mermaid Rendering Fix - Option A

## Specification Phase

### Problem Statement
Mermaid diagrams are stuck on "Rendering diagram..." loading state indefinitely. Root cause analysis reveals:

1. **hasRenderedRef Guard Blocking Legitimate Renders**: Line 86 check `if (hasRenderedRef.current) return;` prevents useEffect from re-running, but async render operations may get abandoned during React re-renders
2. **Silent Early Returns**: Line 89 `if (!containerRef.current) return;` fails silently without logging
3. **No Debug Visibility**: Only 1 error log, no execution flow tracking
4. **Abandoned Async Operations**: mermaid.render() may start but never complete due to component re-renders

### Solution Overview - Option A
**Remove hasRenderedRef guard completely** and rely on React.memo() for re-render prevention, while adding comprehensive debug logging to track execution flow.

### Success Criteria
- ✅ All 3 Mermaid diagrams render successfully on Tab 7
- ✅ No infinite rendering loops
- ✅ Timeout protection works correctly
- ✅ Error handling displays for invalid syntax
- ✅ No console errors in production
- ✅ HMR doesn't break diagram rendering
- ✅ 100% real browser validation with screenshots

---

## Pseudocode Phase

### Core Algorithm Changes

```pseudocode
FUNCTION MermaidDiagram(chart, id, className):
    // STATE
    containerRef = useRef(null)
    error = useState(null)
    isRendering = useState(true)
    renderTimeoutRef = useRef(null)

    // REMOVE: hasRenderedRef = useRef(false)  ← DELETE THIS
    // REMOVE: if (hasRenderedRef.current) return;  ← DELETE THIS

    useEffect(() => {
        LOG "🎨 [Mermaid] useEffect triggered for diagram:", id
        LOG "📦 [Mermaid] containerRef.current exists:", !!containerRef.current
        LOG "📊 [Mermaid] Chart type:", chart.split('\n')[0]

        ASYNC FUNCTION renderDiagram():
            IF !containerRef.current:
                LOG "⚠️ [Mermaid] Container ref not ready, aborting"
                RETURN

            LOG "🚀 [Mermaid] Starting render for:", id

            TRY:
                setIsRendering(true)
                setError(null)

                // Initialize globally once
                initializeMermaid()
                LOG "✅ [Mermaid] Initialized"

                // Generate unique ID
                diagramId = id OR "mermaid-" + random()
                LOG "🆔 [Mermaid] Diagram ID:", diagramId

                // Render with timeout protection
                LOG "⏳ [Mermaid] Calling mermaid.render()..."
                renderPromise = mermaid.render(diagramId, chart.trim())

                timeoutPromise = NEW Promise((_, reject) => {
                    renderTimeoutRef.current = setTimeout(() => {
                        LOG "⏱️ [Mermaid] TIMEOUT TRIGGERED after 10s"
                        reject(Error("Rendering timeout: Diagram took longer than 10 seconds"))
                    }, 10000)
                })

                { svg } = AWAIT Promise.race([renderPromise, timeoutPromise])
                LOG "🎉 [Mermaid] Render complete, SVG length:", svg.length

                // Clear timeout
                IF renderTimeoutRef.current:
                    clearTimeout(renderTimeoutRef.current)
                    renderTimeoutRef.current = null
                    LOG "🧹 [Mermaid] Timeout cleared"

                // Insert SVG into DOM
                IF containerRef.current:
                    containerRef.current.innerHTML = svg
                    LOG "✅ [Mermaid] SVG inserted into DOM"
                    // REMOVE: hasRenderedRef.current = true  ← DELETE THIS
                ELSE:
                    LOG "⚠️ [Mermaid] Container disappeared during render"

                setIsRendering(false)
                LOG "✅ [Mermaid] Rendering complete, loading state cleared"

            CATCH err:
                LOG "❌ [Mermaid] Rendering error:", err

                // Clear timeout on error
                IF renderTimeoutRef.current:
                    clearTimeout(renderTimeoutRef.current)
                    renderTimeoutRef.current = null

                // Enhanced error messages
                errorMessage = determineErrorMessage(err)

                console.error("Mermaid rendering error:", {
                    error: err,
                    chart: chart.substring(0, 100) + "...",
                    diagramType: chart.split('\n')[0],
                    stack: err.stack
                })

                setError(errorMessage)
                setIsRendering(false)
                // REMOVE: hasRenderedRef.current = true  ← DELETE THIS

        renderDiagram()

        // Cleanup
        RETURN () => {
            LOG "🧹 [Mermaid] Cleanup triggered for:", id
            IF renderTimeoutRef.current:
                clearTimeout(renderTimeoutRef.current)
                renderTimeoutRef.current = null
        }
    }, [chart, id])  // Dependencies: chart and id only

    // Render UI based on state
    IF error:
        RETURN ErrorDisplay(error, chart)

    IF isRendering:
        RETURN LoadingSpinner()

    RETURN DiagramContainer(containerRef, className)
```

---

## Architecture Phase

### Component Structure

```
MermaidDiagram (React.FC with memo)
├── State Management
│   ├── containerRef: HTMLDivElement ref
│   ├── error: string | null
│   ├── isRendering: boolean
│   └── renderTimeoutRef: NodeJS.Timeout ref
│
├── Global Initialization
│   └── initializeMermaid() - Singleton pattern
│
├── useEffect Hook (single effect)
│   ├── Entry Logging
│   ├── renderDiagram() async function
│   │   ├── Container validation
│   │   ├── State initialization
│   │   ├── Mermaid initialization
│   │   ├── ID generation
│   │   ├── Promise.race rendering
│   │   ├── Timeout protection
│   │   ├── SVG insertion
│   │   └── Error handling
│   └── Cleanup function
│
└── Conditional Rendering
    ├── Error State → ErrorDisplay
    ├── Loading State → LoadingSpinner
    └── Success State → DiagramContainer
```

### Data Flow

```
Mount → useEffect → containerRef check → renderDiagram() →
  → mermaid.render() → Promise.race →
    → Success: SVG → innerHTML → setIsRendering(false) → Display
    → Timeout: Error → setError() → Error Display
    → Failure: Error → setError() → Error Display

Unmount → Cleanup → Clear timeout
```

### Key Changes from Current Implementation

| Current | Option A | Reason |
|---------|----------|--------|
| `hasRenderedRef` guard on line 86 | **REMOVED** | Blocks legitimate re-renders |
| `hasRenderedRef.current = true` on lines 121, 158 | **REMOVED** | No longer needed |
| `hasRenderedRef` declaration on line 81 | **REMOVED** | Not used anymore |
| Minimal logging (1 error log) | **15+ debug logs** | Execution visibility |
| useEffect deps: `[chart, id]` | **KEEP: `[chart, id]`** | Correct dependencies |

---

## Refinement Phase

### Edge Cases Handled

1. **Container Not Ready**: Early return with warning log
2. **Render Timeout**: Promise.race ensures timeout fires
3. **Component Unmount During Render**: Cleanup clears timeout
4. **Invalid Syntax**: Error state with details
5. **HMR/Fast Refresh**: Each mount gets fresh render attempt
6. **Multiple Diagrams**: Unique IDs prevent conflicts
7. **Empty Chart**: Will trigger Mermaid error, caught and displayed

### Performance Considerations

1. **React.memo()**: Already wrapping component, prevents unnecessary re-renders
2. **Global Initialization**: Singleton pattern - only runs once
3. **Timeout Cleanup**: Prevents memory leaks
4. **SVG Caching**: Browser handles naturally

### Security

- `securityLevel: 'strict'` prevents XSS
- No `dangerouslySetInnerHTML` - using `innerHTML` on controlled ref
- Input sanitization handled by Mermaid library

---

## Completion Phase

### Implementation Checklist

- [ ] Remove all `hasRenderedRef` references (5 locations)
- [ ] Add 15+ debug console.log statements
- [ ] Verify useEffect dependencies
- [ ] Test with all 3 diagram types
- [ ] Verify timeout works
- [ ] Verify error handling works
- [ ] Screenshot proof of working diagrams
- [ ] Run TDD tests
- [ ] Run validation agents
- [ ] Browser console shows no errors
- [ ] HMR doesn't break functionality

### Testing Strategy

#### Unit Tests (TDD)
1. Component renders without crashing
2. Loading state shows initially
3. Successful render displays SVG
4. Timeout triggers error state
5. Invalid syntax shows error
6. Cleanup clears timeout
7. Multiple mounts work correctly

#### Integration Tests (Playwright)
1. Navigate to component showcase Tab 7
2. Verify 3 diagrams render
3. Screenshot each diagram
4. Check for console errors
5. Test HMR (modify component)
6. Verify diagrams still work

#### Validation Agents
1. **production-validator**: Ensure production-ready
2. **tester**: Run test suite
3. **code-analyzer**: Quality check

### Success Metrics

- ✅ 0 console errors
- ✅ 3/3 diagrams render successfully
- ✅ Load time < 10 seconds per diagram
- ✅ All tests pass
- ✅ Code quality score > 90%
- ✅ Screenshots prove functionality

---

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Infinite re-renders | Low | React.memo() prevents |
| Performance degradation | Very Low | No additional renders added |
| Error state not showing | Low | Enhanced error handling |
| Timeout not firing | Very Low | Promise.race guarantees |
| HMR breaks diagrams | Low | Each mount is independent |

---

## Rollback Plan

If Option A fails:
1. Revert changes
2. Implement Option B (fix hasRenderedRef logic)
3. All changes in single component, easy to revert

---

**Status**: Ready for implementation
**Confidence Level**: 95%
**Estimated Time**: 30 minutes implementation + 30 minutes validation
