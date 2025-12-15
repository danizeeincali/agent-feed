# Protection Validation Quick Reference

**Document Version**: 1.0.0
**Date**: 2025-10-19
**Companion to**: PSEUDOCODE-PROTECTION-VALIDATION.md

---

## Protected Agents List

### Phase 4.2 Specialists (6 agents)
```
agent-architect-agent       - Creates new agents
agent-maintenance-agent     - Updates existing agents
skills-architect-agent      - Creates new skills
skills-maintenance-agent    - Updates existing skills
learning-optimizer-agent    - Manages autonomous learning
system-architect-agent      - System-wide architecture
```

### Meta-Coordination (2 agents)
```
meta-agent                  - Generates new agent configurations
meta-update-agent           - Updates agent configurations
```

**Total Protected Agents**: 8

---

## Protection Detection Rules

```typescript
PROTECTED IF:
  1. tier = 2 AND visibility = "protected"
  2. slug IN PHASE_4_2_SPECIALISTS
  3. slug IN META_COORDINATION_AGENTS
  4. filePath MATCHES /^\.system\//

EDITABLE IF:
  - NOT protected, OR
  - user.isAdmin = TRUE (except system directory)

DELETABLE IF:
  - NOT protected (even admins cannot delete protected agents)
```

---

## Quick Algorithm Reference

### Check Protection Status (O(1))
```javascript
function isProtected(agent) {
  return (
    (agent.tier === 2 && agent.visibility === 'protected') ||
    PROTECTED_AGENT_SLUGS.has(agent.slug) ||
    agent.filePath.startsWith('.system/')
  );
}
```

### Check Edit Permission (O(1))
```javascript
function canEdit(agent, user) {
  if (!isProtected(agent)) return true;
  if (agent.filePath.startsWith('.system/')) return false;
  return user.isAdmin;
}
```

### Check Delete Permission (O(1))
```javascript
function canDelete(agent, user) {
  return !isProtected(agent);  // Protected agents cannot be deleted
}
```

---

## API Error Codes

| Code | HTTP Status | Meaning |
|------|-------------|---------|
| `AGENT_PROTECTED` | 403 | Agent is protected from modification |
| `TIER_IMMUTABLE` | 403 | Cannot change agent tier |
| `DELETE_FORBIDDEN` | 403 | Cannot delete protected agent |
| `ADMIN_REQUIRED` | 403 | Admin privileges required |
| `AGENT_NOT_FOUND` | 404 | Agent does not exist |

---

## Protection Messages

### User-Facing Warnings
```
TIER2_PROTECTED:
  "This agent is part of the core system infrastructure and
   cannot be modified through the UI."

SYSTEM_CRITICAL:
  "This specialist agent is essential for platform operations
   and is protected from modification."

FILESYSTEM_READONLY:
  "This agent is stored in a read-only system directory
   and cannot be modified."

META_COORDINATION:
  "This agent manages the agent lifecycle and must not be
   modified to prevent system instability."
```

---

## Implementation Layers

### Layer 1: Frontend (UX)
```typescript
// Visual indicators
<ProtectionBadge agent={agent} />

// Disabled controls
<button disabled={!protection.canEdit}>
  {protection.isProtected ? 'Protected' : 'Edit'}
</button>

// Read-only forms
<AgentForm readOnly={!protection.canEdit} />
```

### Layer 2: API (Security)
```javascript
// Middleware protection
app.use('/api/agents/:slug', protectionMiddleware);

// Validation
if (protection.isProtected && !protection.canEdit) {
  return res.status(403).json({ error: 'Cannot modify protected agent' });
}

// Audit logging
logSecurityEvent({ event: 'PROTECTED_MODIFICATION_ATTEMPT', ... });
```

### Layer 3: Database (Integrity)
```sql
-- Trigger protection
CREATE TRIGGER prevent_protected_modification
  BEFORE UPDATE OR DELETE ON system_agent_templates
  FOR EACH ROW
  WHEN (OLD.tier = 2 AND OLD.visibility = 'protected')
  EXECUTE FUNCTION raise_protection_error();

-- Audit log
INSERT INTO agent_protection_audit (agent_name, operation, blocked, ...)
VALUES ('meta-agent', 'UPDATE', TRUE, ...);
```

---

## Testing Checklist

### Protection Detection
- [ ] Tier 2 + protected visibility detected
- [ ] Phase 4.2 specialists detected
- [ ] Meta-coordination agents detected
- [ ] System directory agents detected
- [ ] Tier 1 public agents not protected

### Permission Checks
- [ ] Regular users cannot edit protected agents
- [ ] Admins can edit protected agents (except .system)
- [ ] No one can delete protected agents
- [ ] Regular users can edit Tier 1 public agents

### API Protection
- [ ] PATCH blocked for protected agents (non-admin)
- [ ] DELETE blocked for all protected agents
- [ ] GET allowed for all agents
- [ ] 403 returned with correct error code
- [ ] Audit log records all attempts

### UI Protection
- [ ] Protection badge renders correctly
- [ ] Edit button disabled for protected agents
- [ ] Warning tooltip displays
- [ ] Read-only form shown when appropriate
- [ ] Error dialog displays on violation attempt

### Database Protection
- [ ] Trigger prevents tier changes
- [ ] Trigger prevents visibility changes
- [ ] Trigger blocks deletion
- [ ] Audit log populated correctly
- [ ] Rollback works on error

---

## Performance Targets

| Operation | Target | Acceptable | Unacceptable |
|-----------|--------|------------|--------------|
| Protection check | <1ms | <5ms | >10ms |
| UI badge render | <1ms | <5ms | >10ms |
| API validation | <2ms | <10ms | >20ms |
| Database trigger | <2ms | <10ms | >20ms |
| Audit log write | <3ms | <10ms | >20ms |

---

## Security Alerts

### High Priority Alerts
- Repeated protection bypass attempts (>3 in 1 hour)
- Direct database modification attempts
- Admin account modifying multiple protected agents
- Protection trigger failures

### Medium Priority Alerts
- Non-admin attempting to edit protected agent
- Tier modification attempts
- Visibility change attempts

### Low Priority Alerts
- UI protection badge display
- Read-only form access

---

## Database Queries

### Find All Protected Agents
```sql
SELECT name, tier, visibility
FROM system_agent_templates
WHERE (tier = 2 AND visibility = 'protected')
   OR name IN (
     'agent-architect-agent',
     'agent-maintenance-agent',
     'skills-architect-agent',
     'skills-maintenance-agent',
     'learning-optimizer-agent',
     'system-architect-agent',
     'meta-agent',
     'meta-update-agent'
   );
```

### View Recent Protection Attempts
```sql
SELECT agent_name, operation, user_id, timestamp
FROM agent_protection_audit
WHERE blocked = TRUE
  AND timestamp > NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC
LIMIT 20;
```

### Protection Attempt Summary
```sql
SELECT
  agent_name,
  operation,
  COUNT(*) as attempts,
  COUNT(DISTINCT user_id) as unique_users
FROM agent_protection_audit
WHERE blocked = TRUE
  AND timestamp > NOW() - INTERVAL '7 days'
GROUP BY agent_name, operation
ORDER BY attempts DESC;
```

---

## Common Implementation Patterns

### Frontend: Conditional Rendering
```typescript
const protection = useMemo(
  () => determineProtectionStatus(agent, user),
  [agent, user]
);

return (
  <div className={protection.isProtected ? 'protected-agent' : ''}>
    {protection.isProtected && <ProtectionBadge protection={protection} />}
    <button
      disabled={!protection.canEdit}
      onClick={protection.canEdit ? handleEdit : showWarning}
    >
      {protection.canEdit ? 'Edit' : 'Protected'}
    </button>
  </div>
);
```

### Backend: Middleware Chain
```javascript
app.patch('/api/agents/:slug',
  authenticate,           // Step 1: Verify user
  protectionMiddleware,   // Step 2: Check protection
  validatePayload,        // Step 3: Validate data
  updateAgent             // Step 4: Perform update
);
```

### Database: Audit Everything
```sql
-- Insert audit record before checking protection
INSERT INTO agent_protection_audit (agent_name, operation, user_id, blocked)
VALUES (NEW.name, TG_OP, CURRENT_USER, TRUE);

-- Then raise exception
RAISE EXCEPTION 'Cannot modify protected agent: %', NEW.name;
```

---

## Troubleshooting

### Issue: Protection not detected
**Check**:
1. Agent has correct `tier` and `visibility` in frontmatter
2. Agent slug matches protected list exactly
3. Protection cache initialized correctly

### Issue: Admin cannot edit
**Check**:
1. User object has `isAdmin: true`
2. Not a .system directory agent (absolute protection)
3. Protection middleware not skipping admin check

### Issue: Audit log not recording
**Check**:
1. Database trigger enabled
2. Audit table exists and writable
3. Logger configured correctly

### Issue: Frontend shows edit button for protected agent
**Check**:
1. Agent data includes protection metadata
2. Frontend calling `determineProtectionStatus()`
3. React component receiving updated props

---

## Implementation Priority

### Phase 1: Core Protection (Week 1)
1. Backend protection detection algorithm
2. API middleware
3. Database triggers
4. Unit tests

### Phase 2: UI Indicators (Week 1)
1. Protection badge component
2. Edit button state logic
3. Read-only form view
4. Warning dialogs

### Phase 3: Audit & Security (Week 2)
1. Audit log table and functions
2. Security event logger
3. Admin alert system
4. Integration tests

### Phase 4: Polish & Documentation (Week 2)
1. Error messages refinement
2. E2E tests
3. User documentation
4. Admin procedures

---

## Key Takeaways

1. **Defense in Depth**: Three layers (UI, API, Database) ensure protection
2. **Explicit List**: 8 protected agents defined in specification
3. **Admin Override**: Admins can edit (but not delete) protected agents
4. **Audit Everything**: All attempts logged for security review
5. **Performance**: All operations O(1) constant time
6. **User Experience**: Clear warnings, not cryptic errors

---

**Quick Links**:
- Full Pseudocode: `/docs/PSEUDOCODE-PROTECTION-VALIDATION.md`
- Specification: `/docs/SPARC-AGENT-TIER-SYSTEM-SPEC.md`
- Database Schema: `/docs/DATABASE-SCHEMA-AGENT-TIERS.md`

**Status**: Ready for Implementation
**Estimated Effort**: 2 weeks (1 senior developer)
