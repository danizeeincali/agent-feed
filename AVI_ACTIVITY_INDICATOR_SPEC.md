# Avi Activity Indicator - SPARC Specification

## Requirements

### Functional Requirements
1. **Remove "Live Tool Execution" sidebar widget** from RealSocialMediaFeed
2. **Display activity inline** with Avi typing animation
3. **Format:** `Avi - {activity description}` where:
   - `Avi` = animated wave pattern (existing)
   - ` - ` = separator (space-dash-space)
   - `{activity description}` = gray, non-bold, truncated activity text

### Activity Text Rules
- **Max Length:** 80 characters (truncate with `...`)
- **Color:** `#D1D5DB` (lighter gray)
- **Font Weight:** 400 (normal, non-bold)
- **Font Size:** 0.85rem (slightly smaller than animation)
- **Priority Filter:** HIGH priority activities only (ignore low/medium)
- **Transition:** Instant updates (no fade animation)

### Data Flow
```
SSE Endpoint (/api/streaming-ticker/stream)
  ↓
useActivityStream hook (subscribes to SSE)
  ↓
EnhancedPostingInterface (state: currentActivity)
  ↓
AviTypingIndicator (prop: activityText)
  ↓
Render: "Avi - {activityText}"
```

### Priority Mapping
**HIGH Priority Activities:**
- Task spawning: `Task(description)`
- Tool execution: `Bash(command)`, `Read(file)`, `Write(file)`
- Phase descriptions: `Phase X: {description}`
- Agent spawns: `tester(description)`, `backend-dev(description)`

**IGNORE:**
- Heartbeats
- Low/medium priority messages
- System health checks

### Examples
**Input SSE Messages:**
```json
{
  "type": "tool_activity",
  "data": {
    "tool": "Task",
    "action": "E2E Playwright validation with screenshots",
    "priority": "high",
    "timestamp": 1234567890
  }
}
```

**Output Display:**
```
Avi - Task(E2E Playwright validation with screenshots)
```

**Long Text Truncation:**
```
Input: "Phase 5 & 6: Launch 3 Concurrent Validation Agents with E2E Testing & Screenshots and Full Regression"
Output: "Avi - Phase 5 & 6: Launch 3 Concurrent Validation Agents with E2E Testing &..."
```

## Non-Functional Requirements
- **Performance:** Activity updates must not cause UI jank
- **Reliability:** SSE reconnection on disconnect
- **Accessibility:** Activity text must be screen-reader friendly
- **Testing:** 100% test coverage (unit + E2E)

## Success Criteria
✅ Live Tool Execution widget removed
✅ Activity text appears inline with Avi animation
✅ Only high-priority activities displayed
✅ Text truncates at 80 chars with ellipsis
✅ Gray color (#D1D5DB) applied
✅ Instant updates (no animation lag)
✅ All tests passing
✅ Screenshot verification via Playwright
✅ No console errors or warnings
✅ No mock/simulated data
