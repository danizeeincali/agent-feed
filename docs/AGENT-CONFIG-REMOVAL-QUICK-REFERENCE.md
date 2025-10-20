# Agent Config Removal - Quick Reference

**For**: Implementation Team
**Phase**: Ready for Pseudocode/Implementation
**Date**: 2025-10-17

---

## TL;DR

Remove agent config UI (`/agents/config` and `/admin/protected-configs`), keep backend APIs functional, document AVI workflow.

**Files to delete**: 3 (1,071 lines)
**Files to modify**: 1 (3 changes)
**Documentation created**: 2,200+ lines

---

## What to Delete

```bash
# Delete these 3 files:
rm frontend/src/pages/AgentConfigPage.tsx
rm frontend/src/components/AgentConfigEditor.tsx
rm frontend/src/components/admin/ProtectedConfigPanel.tsx
```

---

## What to Modify

### App.tsx Changes

**1. Remove import (line 42)**
```typescript
// DELETE THIS LINE:
import AgentConfigPage from './pages/AgentConfigPage';
```

**2. Remove from navigation (line 103)**
```typescript
// REMOVE THIS ENTRY from navigation array:
{ name: 'Agent Config', href: '/agents/config', icon: SettingsIcon },
```

**3. Remove routes (lines 326-339)**
```typescript
// DELETE BOTH ROUTES:
<Route path="/agents/config" element={...} />
<Route path="/admin/protected-configs" element={...} />
```

---

## What to Keep (Do NOT Delete)

```bash
# KEEP THESE:
frontend/src/api/protectedConfigs.ts          # Backend API client
frontend/src/components/ProtectedFieldIndicator.tsx  # Utility component
```

---

## Verification Checklist

After making changes:

```bash
# 1. TypeScript compilation
npm run type-check

# 2. Build
npm run build

# 3. Tests
npm test

# 4. E2E tests
npm run test:e2e

# 5. Verify routes return 404
curl http://localhost:3000/agents/config
curl http://localhost:3000/admin/protected-configs
```

Expected results:
- ✅ No TypeScript errors
- ✅ Build succeeds
- ✅ All tests pass
- ✅ Both routes return 404
- ✅ Navigation menu shows no "Agent Config"

---

## Backend API Verification

Test that APIs still work:

```bash
# Get all configs
curl -X GET http://localhost:3000/api/v1/protected-configs \
  -H "Authorization: Bearer $TOKEN"

# Get specific config
curl -X GET http://localhost:3000/api/v1/protected-configs/strategic-planner \
  -H "Authorization: Bearer $TOKEN"
```

Expected: Both return 200 OK with data

---

## Files Affected Summary

| File | Action | Lines | Location |
|------|--------|-------|----------|
| AgentConfigPage.tsx | DELETE | 257 | `/frontend/src/pages/` |
| AgentConfigEditor.tsx | DELETE | 366 | `/frontend/src/components/` |
| ProtectedConfigPanel.tsx | DELETE | 448 | `/frontend/src/components/admin/` |
| App.tsx | MODIFY | 3 changes | `/frontend/src/` |
| protectedConfigs.ts | KEEP | - | `/frontend/src/api/` |
| ProtectedFieldIndicator.tsx | KEEP | - | `/frontend/src/components/` |

**Total code removed**: 1,071 lines
**Expected bundle size reduction**: ~50KB

---

## Test Files to Create

1. **Unit Test**: `frontend/src/__tests__/agent-config-removal.test.tsx`
   - Verify components deleted
   - Verify navigation updated
   - Verify API client exists

2. **Integration Test**: `frontend/src/__tests__/integration/routing-after-removal.test.tsx`
   - Test valid routes work
   - Test removed routes return 404

3. **E2E Test**: `tests/e2e/agent-config-removal.spec.ts`
   - Navigate to removed routes
   - Verify 404 page shown
   - Verify navigation updated

---

## Common Issues and Solutions

### Issue: TypeScript errors after deletion
**Solution**: Make sure all 3 App.tsx changes were made correctly

### Issue: Tests failing
**Solution**: Update test imports that reference deleted components

### Issue: Navigation still shows "Agent Config"
**Solution**: Verify line 103 change in App.tsx navigation array

### Issue: Routes not returning 404
**Solution**: Verify both route definitions removed (lines 326-339)

---

## Rollback (If Needed)

```bash
# Quick rollback:
git revert HEAD
git push origin main

# Or restore specific files:
git checkout HEAD~1 -- frontend/src/pages/AgentConfigPage.tsx
git checkout HEAD~1 -- frontend/src/components/AgentConfigEditor.tsx
git checkout HEAD~1 -- frontend/src/components/admin/ProtectedConfigPanel.tsx
git checkout HEAD~1 -- frontend/src/App.tsx
```

---

## Documentation

### For Developers
See: `/workspaces/agent-feed/docs/SPARC-AGENT-CONFIG-REMOVAL-SPEC.md`
- Complete technical specification
- 1,040 lines of detailed requirements

### For Users
See: `/workspaces/agent-feed/docs/AVI-CONFIGURATION-WORKFLOW.md`
- How to use AVI for configuration
- 1,160 lines with 11 detailed examples

### Summary
See: `/workspaces/agent-feed/docs/AGENT-CONFIG-REMOVAL-SPECIFICATION-SUMMARY.md`
- Executive overview
- Key highlights

---

## Git Workflow

```bash
# 1. Create branch
git checkout -b feature/remove-agent-config-ui

# 2. Make changes
rm frontend/src/pages/AgentConfigPage.tsx
rm frontend/src/components/AgentConfigEditor.tsx
rm frontend/src/components/admin/ProtectedConfigPanel.tsx
# Edit App.tsx (3 changes)

# 3. Verify
npm run type-check && npm run build && npm test

# 4. Commit
git add .
git commit -m "Remove agent config UI, preserve backend APIs

- Delete AgentConfigPage, AgentConfigEditor, ProtectedConfigPanel
- Remove routes /agents/config and /admin/protected-configs
- Update navigation menu to remove Agent Config link
- Keep backend APIs and API client functional
- Add comprehensive AVI workflow documentation

Reduces bundle size by ~50KB (-1,071 lines)
All functionality replaced by AVI natural language interface

Tests: Unit, integration, E2E tests all passing
Backend APIs verified functional
Documentation complete"

# 5. Push
git push origin feature/remove-agent-config-ui

# 6. Create PR
gh pr create --title "Remove agent config UI pages" \
  --body "See SPARC-AGENT-CONFIG-REMOVAL-SPEC.md for full specification"
```

---

## Success Metrics

After deployment, verify:
- [ ] `/agents/config` returns 404
- [ ] `/admin/protected-configs` returns 404
- [ ] Navigation shows no "Agent Config"
- [ ] All other routes work
- [ ] Backend APIs functional
- [ ] Bundle size reduced by ~50KB
- [ ] No console errors
- [ ] All tests passing

---

## AVI Usage for Configuration

**Quick examples for users**:

View config:
```
You: Show me the config for strategic-planner
```

Change priority:
```
You: Set strategic-planner priority to P1
```

Update description:
```
You: Update strategic-planner description to "High-priority orchestrator"
```

See full guide: `/workspaces/agent-feed/docs/AVI-CONFIGURATION-WORKFLOW.md`

---

## Contact

**Questions?**
- Technical: See main spec document
- AVI workflow: See AVI guide
- Issues: Create GitHub issue

**Specification by**: SPARC Specification Agent
**Date**: 2025-10-17
**Status**: ✅ READY FOR IMPLEMENTATION

---

**Quick Links**:
- [Main Specification](./SPARC-AGENT-CONFIG-REMOVAL-SPEC.md)
- [AVI Workflow Guide](./AVI-CONFIGURATION-WORKFLOW.md)
- [Summary](./AGENT-CONFIG-REMOVAL-SPECIFICATION-SUMMARY.md)
