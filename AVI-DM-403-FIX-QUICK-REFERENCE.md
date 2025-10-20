# AVI DM 403 Fix - Quick Reference Guide

**Date**: 2025-10-20
**Status**: ✅ Specification Complete - Ready for Implementation
**Version**: 2.0.0 (Root Cause Corrected)

---

## TL;DR - The Problem

**User sees**: "I encountered an error: API error: 403 Forbidden" when sending messages to Avi

**Root cause**: `EnhancedPostingInterface.tsx` line 286 uses relative URL `/api/claude-code/streaming-chat` which depends on Vite proxy, but proxy returns 403 instead of forwarding to backend

**Backend**: ✅ Works perfectly (verified with curl - returns 200 OK)

**The issue**: Frontend fetch implementation, NOT backend

**Critical Discovery**: AVI DM uses `EnhancedPostingInterface.tsx`, NOT `AviDMService.ts` (which was already fixed)

---

## Quick Solution (15 minutes)

### 1. Change One Line

**File**: `/workspaces/agent-feed/frontend/src/components/EnhancedPostingInterface.tsx`

**Line 286 - BEFORE**:
```typescript
const response = await fetch('/api/claude-code/streaming-chat', {
```

**Line 286 - AFTER**:
```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
const response = await fetch(`${API_BASE_URL}/api/claude-code/streaming-chat`, {
```

### 2. Add Environment Variable

**File**: `/workspaces/agent-feed/frontend/.env.development`
```bash
VITE_API_BASE_URL=http://localhost:3001
```

### 3. Test

```bash
# Restart frontend dev server
npm run dev

# Test in browser:
# 1. Open Avi DM interface
# 2. Send message: "What is 2 + 2?"
# 3. Should receive real Claude response (not 403)
```

### 4. Verify No 403 Error

- [ ] Message sends successfully
- [ ] Real Claude response appears (NOT mock)
- [ ] No 403 error in console
- [ ] Backend logs show request received

---

## Why This Fixes It

**Current (Broken)**:
```
Browser → Vite Proxy (/api/claude-code/...) → 403 Error ❌
```

**After Fix**:
```
Browser → Direct to Backend (http://localhost:3001/api/claude-code/...) → 200 OK ✅
```

**Why it works**: Bypasses Vite proxy entirely, uses absolute URL like `AviDMService.ts` (which already works)

---

## Key Requirements

**CRITICAL - No Mock Data**:
- ✅ Must use REAL Claude Code SDK
- ❌ NO simulated responses
- ❌ NO mock data
- ❌ NO fake responses
- ✅ Claude must have actual file system access
- ✅ Claude must be able to execute bash commands

**Acceptance Criteria**:
- [ ] User can send messages to Avi
- [ ] Avi responds with REAL Claude output
- [ ] No 403 errors
- [ ] Error handling works for network/timeout errors
- [ ] TypeScript compiles without errors
- [ ] No regressions in existing features

---

## Solution Options Comparison

| Option | Time | Risk | Quality | Status |
|--------|------|------|---------|--------|
| **A: Fix Vite Proxy** | 2-4 hrs | Medium | Good | ⏸️ Deprioritized |
| **B: Absolute URL** | 15 min | Low | Fair | ⭐ RECOMMENDED (Phase 1) |
| **C: Use AviDMService** | 2-3 hrs | Low | Excellent | 📅 Follow-up (Phase 2) |

**Recommended**: Hybrid approach (B → C)
1. **Phase 1**: Quick fix with absolute URL (15 min) - Unblock users NOW
2. **Phase 2**: Refactor to service layer (1 week) - Proper architecture

---

## Testing Checklist

**Unit Tests**:
- [ ] Test successful API call
- [ ] Test network error handling
- [ ] Test timeout error handling
- [ ] Test 403 error handling
- [ ] Test response parsing

**Integration Tests**:
- [ ] Backend API returns 200 OK
- [ ] Real Claude response received
- [ ] Invalid message format returns 400

**E2E Tests**:
- [ ] User can send message and receive response
- [ ] Real Claude tools work (Read, Bash)
- [ ] Error messages display correctly
- [ ] Timeout handling works

---

## Complete Documentation

**Full Specification**: [/workspaces/agent-feed/docs/SPARC-AVI-DM-403-FIX-SPECIFICATION.md](/workspaces/agent-feed/docs/SPARC-AVI-DM-403-FIX-SPECIFICATION.md)

Contains:
- Complete root cause analysis
- Technical architecture diagrams
- All three solution options (A, B, C)
- Detailed acceptance criteria
- Complete test requirements
- Risk analysis
- Implementation plan
- Success metrics

**Investigation Documents**:
- [AVI-DM-403-ROOT-CAUSE-FOUND.md](/workspaces/agent-feed/AVI-DM-403-ROOT-CAUSE-FOUND.md) - Root cause discovery
- [AVI-DM-403-INVESTIGATION-PART2.md](/workspaces/agent-feed/AVI-DM-403-INVESTIGATION-PART2.md) - Backend verification

---

## Implementation Timeline

**Phase 1: Immediate Fix**
- Code change: 15 minutes
- Environment setup: 5 minutes
- Testing: 30 minutes
- Validation: 15 minutes
- **Total**: 1.5 hours

**Phase 2: Architectural Improvement** (Optional follow-up)
- Design: 2 hours
- Implementation: 8 hours
- Testing: 4 hours
- Review: 4 hours
- **Total**: 18 hours (3 days)

---

## Troubleshooting

**Still seeing 403?**
1. Hard refresh browser (Ctrl+Shift+R)
2. Check environment variable loaded: `console.log(import.meta.env.VITE_API_BASE_URL)`
3. Verify backend running: `curl http://localhost:3001/health`
4. Check network tab for actual URL being called
5. Restart Vite dev server

**CORS errors?**
1. Verify backend CORS includes `localhost:5173`
2. Check if HTTPS/HTTP mixing
3. Use Vite proxy if needed (Option A)

**Request timeout?**
1. Increase frontend timeout (currently 90s)
2. Check Claude Code is responding
3. Verify backend timeout (120s) > frontend timeout (90s)

---

## Success Metrics

**Functional**:
- Message success rate: >99%
- Response accuracy: 100% real (no mocks)
- Error recovery: <5% user retries

**Performance**:
- Response time P50: <30s
- Response time P95: <90s
- Frontend overhead: <100ms

**Reliability**:
- Uptime: 99.5%
- Error rate: <0.5%

---

## Files Modified

**Phase 1**:
- `/workspaces/agent-feed/frontend/src/components/EnhancedPostingInterface.tsx` (1 line change)
- `/workspaces/agent-feed/frontend/.env.development` (new file or update)

**Phase 2** (Optional):
- `/workspaces/agent-feed/frontend/src/components/EnhancedPostingInterface.tsx` (refactor)
- `/workspaces/agent-feed/frontend/src/services/AviDMService.ts` (use existing)

---

## Contact & Support

**Implementation Questions**: See full specification document
**Testing Questions**: See Section 8 of specification
**Architecture Questions**: See Section 2 of specification

---

**Status**: ✅ Ready for implementation
**Priority**: HIGH (Core functionality broken)
**Estimated Fix Time**: 15-30 minutes
**Risk Level**: LOW (Proven approach)

---

**Last Updated**: 2025-10-20
**Version**: 2.0.0 (Corrected root cause from AviDMService.ts to EnhancedPostingInterface.tsx)
