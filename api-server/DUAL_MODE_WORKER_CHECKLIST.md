# Dual-Mode Worker Implementation Checklist

## Overview

This checklist tracks the implementation of the dual-mode worker architecture. Use this as a project tracking tool.

**Status:** Design Complete - Ready for Implementation
**Start Date:** 2025-10-13
**Target Completion:** 2025-11-10 (4 weeks)

---

## Phase 1: Core Implementation (Week 1-2)

### Week 1: Foundation

#### Task Type Detector
- [ ] Create `worker/task-detector.js`
- [ ] Implement pattern matching logic
- [ ] Add metadata parsing
- [ ] Write unit tests (15+ test cases)
- [ ] Test all pattern variations
- [ ] Document detection rules

**Files:**
- `/workspaces/agent-feed/api-server/worker/task-detector.js`
- `/workspaces/agent-feed/api-server/tests/unit/task-detector.test.js`

**Acceptance Criteria:**
- All patterns correctly detected
- Metadata takes priority over patterns
- Default to RSS feed for unknown patterns
- 100% test coverage

---

#### Base Executor Class
- [ ] Create `worker/executors/base-executor.js`
- [ ] Define abstract methods (execute, validate)
- [ ] Implement common error handling
- [ ] Add logging utilities
- [ ] Write base tests

**Files:**
- `/workspaces/agent-feed/api-server/worker/executors/base-executor.js`
- `/workspaces/agent-feed/api-server/tests/unit/executors/base-executor.test.js`

**Acceptance Criteria:**
- Clean abstract interface
- Consistent error handling
- Structured logging

---

#### File Operation Executor
- [ ] Create `worker/executors/file-operation-executor.js`
- [ ] Implement path validation
- [ ] Implement create operation
- [ ] Implement read operation
- [ ] Implement write operation
- [ ] Implement delete operation
- [ ] Add size limit checks
- [ ] Add directory traversal protection
- [ ] Write security tests (10+ test cases)
- [ ] Write operation tests (20+ test cases)

**Files:**
- `/workspaces/agent-feed/api-server/worker/executors/file-operation-executor.js`
- `/workspaces/agent-feed/api-server/tests/unit/executors/file-operation-executor.test.js`
- `/workspaces/agent-feed/api-server/tests/security/file-operation-security.test.js`

**Security Test Cases:**
- [ ] Block `../../../etc/passwd`
- [ ] Block `/tmp/../etc/passwd`
- [ ] Block `/etc/passwd` (outside whitelist)
- [ ] Block symlink attacks
- [ ] Enforce 10MB file size limit
- [ ] Test whitelist validation

**Acceptance Criteria:**
- All 4 operations work correctly
- Path validation blocks all attack vectors
- Size limits enforced
- Clear error messages
- 100% security test coverage

---

### Week 2: Executors

#### Command Executor
- [ ] Create `worker/executors/command-executor.js`
- [ ] Implement command whitelist
- [ ] Implement pattern blocking
- [ ] Implement spawn (shell: false)
- [ ] Implement timeout handling
- [ ] Implement stdout/stderr capture
- [ ] Write security tests (10+ test cases)
- [ ] Write execution tests (15+ test cases)

**Files:**
- `/workspaces/agent-feed/api-server/worker/executors/command-executor.js`
- `/workspaces/agent-feed/api-server/tests/unit/executors/command-executor.test.js`
- `/workspaces/agent-feed/api-server/tests/security/command-executor-security.test.js`

**Security Test Cases:**
- [ ] Block `rm -rf /`
- [ ] Block `dd if=/dev/zero of=/dev/sda`
- [ ] Block shell injection attempts
- [ ] Enforce command whitelist
- [ ] Test timeout enforcement (30s)

**Acceptance Criteria:**
- Only whitelisted commands execute
- Shell injection blocked
- Timeout works correctly
- Output captured properly
- Exit codes handled

---

#### API Executor
- [ ] Create `worker/executors/api-executor.js`
- [ ] Implement URL validation
- [ ] Implement SSRF prevention
- [ ] Implement GET/POST/PUT/DELETE methods
- [ ] Implement retry logic with exponential backoff
- [ ] Implement timeout (10s)
- [ ] Implement response size limits (5MB)
- [ ] Write security tests (10+ test cases)
- [ ] Write execution tests (20+ test cases)

**Files:**
- `/workspaces/agent-feed/api-server/worker/executors/api-executor.js`
- `/workspaces/agent-feed/api-server/tests/unit/executors/api-executor.test.js`
- `/workspaces/agent-feed/api-server/tests/security/api-executor-security.test.js`

**Security Test Cases:**
- [ ] Block http://localhost:6379
- [ ] Block http://127.0.0.1:6379
- [ ] Block http://10.0.0.1
- [ ] Block http://169.254.169.254 (AWS metadata)
- [ ] Enforce response size limit
- [ ] Test timeout enforcement

**Acceptance Criteria:**
- SSRF protection blocks internal IPs
- All HTTP methods work
- Retry logic works with backoff
- Timeout enforced
- Response size limited

---

#### RSS Feed Executor
- [ ] Create `worker/executors/rss-feed-executor.js`
- [ ] Wrap existing RSS feed logic
- [ ] Implement unified interface
- [ ] Add error handling
- [ ] Write integration tests

**Files:**
- `/workspaces/agent-feed/api-server/worker/executors/rss-feed-executor.js`
- `/workspaces/agent-feed/api-server/tests/unit/executors/rss-feed-executor.test.js`

**Acceptance Criteria:**
- Existing functionality preserved
- Unified interface implemented
- Backward compatible

---

## Phase 2: Integration (Week 3)

### Unified Agent Worker
- [ ] Create `worker/unified-agent-worker.js`
- [ ] Implement worker lifecycle (start, execute, stop)
- [ ] Implement task detection integration
- [ ] Implement executor routing
- [ ] Implement result capture
- [ ] Implement error handling
- [ ] Implement ticket status updates
- [ ] Write unit tests (20+ test cases)
- [ ] Write integration tests (10+ test cases)

**Files:**
- `/workspaces/agent-feed/api-server/worker/unified-agent-worker.js`
- `/workspaces/agent-feed/api-server/tests/unit/unified-agent-worker.test.js`
- `/workspaces/agent-feed/api-server/tests/integration/unified-agent-worker-integration.test.js`

**Integration Test Cases:**
- [ ] End-to-end file operation
- [ ] End-to-end command execution
- [ ] End-to-end API call
- [ ] End-to-end RSS feed
- [ ] Error handling (invalid task)
- [ ] Error handling (security violation)
- [ ] Retry logic
- [ ] Ticket status updates

**Acceptance Criteria:**
- Worker spawns correctly
- Task detection works
- Routing to correct executor
- Results captured and stored
- Errors handled gracefully
- Tickets updated correctly

---

### Orchestrator Integration
- [ ] Update `avi/orchestrator.js`
- [ ] Replace AgentWorker with UnifiedAgentWorker
- [ ] Test worker spawning
- [ ] Test worker cleanup
- [ ] Test capacity management
- [ ] Test health monitoring
- [ ] Write orchestrator tests

**Files:**
- `/workspaces/agent-feed/api-server/avi/orchestrator.js` (modified)
- `/workspaces/agent-feed/api-server/tests/integration/avi/orchestrator-integration.test.js` (updated)

**Changes:**
```javascript
// Line ~141
const worker = new UnifiedAgentWorker({
  workerId,
  ticketId: ticket.id.toString(),
  agentId: ticket.agent_id
});
```

**Acceptance Criteria:**
- Orchestrator spawns UnifiedAgentWorker
- Worker lifecycle managed correctly
- Capacity limits enforced
- Health checks pass

---

### Post Creation Enhancement
- [ ] Update POST /api/v1/agent-posts endpoint
- [ ] Add metadata support
- [ ] Add task type detection
- [ ] Add validation
- [ ] Write API tests

**Files:**
- `/workspaces/agent-feed/api-server/routes/agent-posts.js` (or server.js)
- `/workspaces/agent-feed/api-server/tests/integration/agent-posts-api.test.js`

**API Test Cases:**
- [ ] Create file operation task
- [ ] Create command task
- [ ] Create API call task
- [ ] Create RSS feed task (backward compatible)
- [ ] Invalid task type rejected
- [ ] Missing parameters rejected

**Acceptance Criteria:**
- Metadata accepted and stored
- Tasks created correctly
- Validation works
- Backward compatible with existing posts

---

## Phase 3: Testing & Security (Week 3)

### Security Audit
- [ ] Review all path validation logic
- [ ] Review all command validation logic
- [ ] Review all API validation logic
- [ ] Penetration testing (file operations)
- [ ] Penetration testing (command execution)
- [ ] Penetration testing (API calls)
- [ ] Document security findings
- [ ] Fix security issues

**Tools:**
- OWASP ZAP
- Burp Suite
- Custom fuzzing scripts

**Test Cases:**
- [ ] 50+ malicious file paths
- [ ] 30+ command injection attempts
- [ ] 20+ SSRF attempts
- [ ] Path traversal fuzzing
- [ ] Unicode/encoding attacks

**Acceptance Criteria:**
- Zero critical security issues
- All known attack vectors blocked
- Security audit report completed

---

### Performance Testing
- [ ] Benchmark file operations
- [ ] Benchmark command execution
- [ ] Benchmark API calls
- [ ] Test concurrent workers (5 workers)
- [ ] Test queue processing throughput
- [ ] Test memory usage
- [ ] Document performance metrics

**Performance Targets:**
- File operations: < 100ms average
- Command execution: < 2s average
- API calls: < 1s average
- Queue throughput: > 100 tasks/minute
- Memory per worker: < 512MB

**Acceptance Criteria:**
- All performance targets met
- No memory leaks detected
- Stable under load

---

### Integration Testing
- [ ] Test complete ticket lifecycle
- [ ] Test concurrent task execution
- [ ] Test error recovery
- [ ] Test retry logic
- [ ] Test orchestrator restart
- [ ] Test database connectivity issues
- [ ] Test network failures

**Acceptance Criteria:**
- All integration tests pass
- Error recovery works
- System resilient to failures

---

## Phase 4: Deployment (Week 4)

### Staging Deployment
- [ ] Deploy to staging environment
- [ ] Run smoke tests
- [ ] Run full test suite
- [ ] Monitor for errors
- [ ] Test with real data
- [ ] Performance validation

**Acceptance Criteria:**
- All tests pass in staging
- No errors in 24-hour monitoring
- Performance meets targets

---

### Production Deployment
- [ ] Create deployment plan
- [ ] Schedule maintenance window
- [ ] Deploy new code (feature flag OFF)
- [ ] Run smoke tests
- [ ] Enable feature flag (10% traffic)
- [ ] Monitor metrics and errors
- [ ] Increase to 50% traffic
- [ ] Monitor for 24 hours
- [ ] Full rollout (100% traffic)
- [ ] Monitor for 48 hours
- [ ] Remove old AgentWorker code

**Rollback Plan:**
- [ ] Document rollback steps
- [ ] Test rollback procedure
- [ ] Keep old AgentWorker available

**Acceptance Criteria:**
- Zero downtime deployment
- Error rate < 1%
- Performance meets SLA
- Successful rollback testing

---

### Monitoring & Alerting
- [ ] Create Grafana dashboards
- [ ] Set up Prometheus metrics
- [ ] Configure alerts (error rate)
- [ ] Configure alerts (queue depth)
- [ ] Configure alerts (worker health)
- [ ] Test alert notifications
- [ ] Document alert response procedures

**Dashboards:**
- Queue metrics (pending, processing, completed, failed)
- Worker metrics (active, spawned, tasks processed)
- Task type distribution
- Error rate by task type
- Execution time by task type
- Resource usage (CPU, memory)

**Alerts:**
- Error rate > 10% (Warning)
- Error rate > 25% (Critical)
- Queue depth > 100 (Warning)
- No completed tasks in 5 min (Critical)
- Worker crash (Critical)

**Acceptance Criteria:**
- All dashboards functional
- Alerts trigger correctly
- On-call team trained

---

## Phase 5: Documentation & Training (Week 4+)

### Developer Documentation
- [x] Architecture document (DUAL_MODE_WORKER_ARCHITECTURE.md)
- [x] Quick start guide (DUAL_MODE_WORKER_QUICK_START.md)
- [x] Decision records (DUAL_MODE_WORKER_DECISIONS.md)
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Code comments and JSDoc
- [ ] Migration guide (AgentWorker → UnifiedAgentWorker)

---

### Operational Documentation
- [ ] Deployment runbook
- [ ] Troubleshooting guide
- [ ] Alert response procedures
- [ ] Monitoring guide
- [ ] Backup and recovery procedures

---

### Training
- [ ] Developer training session
- [ ] Operations team training
- [ ] On-call team training
- [ ] Create training videos/slides
- [ ] Conduct Q&A session

---

## Acceptance Criteria (Overall)

### Functionality
- [x] Architecture designed
- [ ] All executors implemented
- [ ] Task detection works
- [ ] Worker integration complete
- [ ] Orchestrator updated
- [ ] API endpoints updated

### Quality
- [ ] 90%+ test coverage
- [ ] Zero critical bugs
- [ ] Zero security vulnerabilities
- [ ] Performance targets met

### Operations
- [ ] Monitoring dashboards deployed
- [ ] Alerts configured
- [ ] Documentation complete
- [ ] Team trained

### Production
- [ ] Staging deployment successful
- [ ] Production deployment successful
- [ ] 48 hours stable operation
- [ ] Rollback plan tested

---

## Progress Tracking

### Week 1 Progress: ⬜⬜⬜⬜⬜⬜⬜ 0%
- [ ] Task detector
- [ ] Base executor
- [ ] File operation executor (50% complete)

### Week 2 Progress: ⬜⬜⬜⬜⬜⬜⬜ 0%
- [ ] Command executor
- [ ] API executor
- [ ] RSS feed executor

### Week 3 Progress: ⬜⬜⬜⬜⬜⬜⬜ 0%
- [ ] Unified worker
- [ ] Orchestrator integration
- [ ] Security audit

### Week 4 Progress: ⬜⬜⬜⬜⬜⬜⬜ 0%
- [ ] Staging deployment
- [ ] Production deployment
- [ ] Monitoring setup

### Overall Progress: ⬛⬜⬜⬜⬜⬜⬜ 10%
- [x] Design complete
- [ ] Implementation
- [ ] Testing
- [ ] Deployment

---

## Risk Register

| Risk | Status | Mitigation | Owner |
|------|--------|------------|-------|
| Security vulnerability | Open | Multi-layer validation, audit | Security Team |
| Performance degradation | Open | Benchmarking, limits | Architect |
| Migration issues | Open | Parallel deployment | DevOps |
| Data loss | Open | Transaction safety | Database Team |

---

## Dependencies

### External
- None (all internal implementation)

### Internal
- PostgreSQL database (existing)
- Work queue repository (existing)
- Orchestrator (existing, needs update)

---

## Timeline

```
Week 1: Oct 13 - Oct 19
  └─ Task detector, base executor, file executor

Week 2: Oct 20 - Oct 26
  └─ Command executor, API executor, RSS executor

Week 3: Oct 27 - Nov 2
  └─ Unified worker, integration, testing

Week 4: Nov 3 - Nov 10
  └─ Deployment, monitoring, training
```

---

## Sign-off

### Design Review
- [ ] Architecture Team (Date: _______)
- [ ] Security Team (Date: _______)
- [ ] Operations Team (Date: _______)

### Implementation Review
- [ ] Code review complete (Date: _______)
- [ ] Security audit complete (Date: _______)
- [ ] Testing complete (Date: _______)

### Production Approval
- [ ] CTO Approval (Date: _______)
- [ ] Operations Manager (Date: _______)
- [ ] Security Officer (Date: _______)

---

## Notes

Use this space to track blockers, decisions, and important notes:

```
[Date] [Issue/Decision]
```

---

**Last Updated:** 2025-10-13
**Version:** 1.0
**Owner:** System Architecture Team
**Status:** Ready for Implementation

---

## Quick Commands

```bash
# Run all tests
npm test

# Run security tests only
npm test -- security

# Run integration tests
npm test -- integration

# Check test coverage
npm run coverage

# Start orchestrator (development)
npm run dev:orchestrator

# Monitor worker logs
tail -f logs/worker-*.log
```

---

**END OF CHECKLIST**
