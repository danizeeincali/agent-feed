# Deployment Verification Checklist

## Critical Pre-Fix Analysis

### 1. Component Usage Audit
- [ ] Search for all imports of target component: `grep -r "import.*ComponentName" src/`
- [ ] Identify which component version is actually used in production
- [ ] Check for multiple similar components (e.g., `Terminal.tsx` vs `TerminalFixed.tsx`)
- [ ] Verify component export names match import statements

### 2. Hot Reload Status Check
- [ ] Confirm dev server is running and hot reload is active
- [ ] Check browser console for hot reload confirmation messages
- [ ] Verify timestamp of file modifications matches browser loading time
- [ ] Force browser refresh if hot reload seems stale

## Post-Fix Verification

### 3. Real-Time Production Testing
- [ ] Test actual functionality in browser, not just unit tests
- [ ] Use browser dev tools to inspect network traffic/WebSocket messages
- [ ] Reproduce original issue to confirm it's actually fixed
- [ ] Test edge cases that originally caused the problem

### 4. Code Deployment Confirmation
- [ ] Verify fixes are applied to the component that's actually being used
- [ ] Check that file timestamps reflect recent changes
- [ ] Confirm no caching issues are interfering with deployment
- [ ] Use browser "View Source" or dev tools to confirm latest code is loaded

### 5. Multi-Environment Testing
- [ ] Test in development environment
- [ ] Test in staging/preview environment if available
- [ ] Verify production build includes the fixes
- [ ] Test across different browsers/devices

## Failure Pattern Detection

### 6. Common Failure Indicators
- [ ] **Tests Pass, User Reports Failure**: Check component import mismatch
- [ ] **Hot Reload Not Working**: Force browser refresh and verify file timestamps
- [ ] **Multiple Component Versions**: Consolidate or clearly identify which is production
- [ ] **Cached Assets**: Clear browser cache and verify new code is loaded

### 7. Documentation and Tracking
- [ ] Record which specific files were modified
- [ ] Document the exact nature of the fix applied
- [ ] Note any gotchas or edge cases discovered during verification
- [ ] Update neural training data with failure patterns for future prevention

## Emergency Recovery

### 8. If Fix Still Fails
- [ ] Revert changes and start from clean state
- [ ] Re-analyze the actual problem versus assumed problem
- [ ] Check for dependency conflicts or version mismatches
- [ ] Consider architectural issues that might require different approach

### 9. Pattern Learning
- [ ] Create NLT record documenting the failure pattern
- [ ] Update neural training weights based on effectiveness
- [ ] Identify systematic improvements to prevent similar issues
- [ ] Build automated verification scripts for common scenarios

## Success Metrics

### 10. Verification Complete When:
- [ ] User confirms issue is resolved
- [ ] Real-time testing reproduces successful behavior
- [ ] Production environment reflects the applied fixes  
- [ ] No regression in related functionality
- [ ] Documentation updated with lessons learned