---
name: Update Protocols
description: Agent update management protocols including version control, rollback procedures, migration patterns, and backward compatibility strategies
version: "1.0.0"
category: system
_protected: true
_allowed_agents: ["meta-update-agent", "meta-agent"]
_last_updated: "2025-10-18"
---

# Update Protocols Skill

## Purpose

Provides systematic protocols for managing agent updates, version control, rollback procedures, migration patterns, and ensuring backward compatibility across the agent ecosystem. Ensures safe, reliable agent evolution without disrupting production operations.

## When to Use This Skill

- Planning agent updates and improvements
- Deploying new agent versions
- Managing agent migrations
- Rolling back problematic updates
- Ensuring backward compatibility
- Coordinating ecosystem-wide changes
- Handling breaking changes safely

## Core Protocols

### 1. Semantic Versioning for Agents

**Version Number Structure**:
```
MAJOR.MINOR.PATCH (e.g., 2.3.1)

MAJOR version:
  - Breaking changes to agent interface
  - Incompatible capability changes
  - Required configuration updates
  - Migration required

MINOR version:
  - New capabilities added
  - Backward-compatible features
  - Non-breaking enhancements
  - Optional configuration additions

PATCH version:
  - Bug fixes only
  - Performance improvements
  - Documentation updates
  - No functional changes
```

**Version Metadata**:
```yaml
# Agent version manifest
name: personal-todos-agent
version: 2.1.0
published: 2025-10-18T10:30:00Z
previous_version: 2.0.5
compatibility_version: 2.0.0  # Oldest compatible version

changes:
  type: minor
  breaking: false
  migration_required: false

  added:
    - IMPACT priority framework
    - Fibonacci priority levels
    - Priority-based sorting

  changed:
    - Enhanced task categorization
    - Improved urgency detection

  deprecated:
    - Old priority levels (P1-P5)
    - Simple urgency flags

  removed: []

  fixed:
    - Task update race conditions
    - Priority calculation edge cases

dependencies:
  required:
    - task-management: "^3.0.0"
    - user-preferences: "^1.2.0"

  optional:
    - productivity-patterns: "^2.1.0"

rollback:
  supported: true
  automatic: true
  manual_steps: []
```

### 2. Update Planning Framework

**Pre-Update Assessment**:
```
IMPACT ANALYSIS:
  1. Which agents are affected?
     - Direct: Agents being updated
     - Indirect: Agents depending on updated agents
     - Ecosystem: System-wide implications

  2. What dependencies exist?
     - Required skill updates
     - Configuration changes
     - Data migrations
     - API changes

  3. What is the risk level?
     - LOW: Patch version, isolated changes
     - MEDIUM: Minor version, new features
     - HIGH: Major version, breaking changes
     - CRITICAL: Core system changes

  4. What is the rollback plan?
     - Automatic rollback triggers
     - Manual rollback procedures
     - Data recovery steps
     - User communication plan

COMPATIBILITY CHECK:
  ✓ Backward compatibility maintained?
  ✓ Configuration format unchanged?
  ✓ API contracts honored?
  ✓ Data structures compatible?
  ✓ Skill dependencies satisfied?
```

**Update Categorization**:
```
PATCH UPDATES (Low Risk):
  - Deploy during business hours
  - Automated deployment acceptable
  - Rollback if issues detected
  - Minimal user communication

MINOR UPDATES (Medium Risk):
  - Deploy during low-traffic periods
  - Monitor closely for 24 hours
  - Have rollback ready
  - Notify affected users

MAJOR UPDATES (High Risk):
  - Deploy during maintenance window
  - Phased rollout (canary → 10% → 50% → 100%)
  - Extended monitoring period
  - Full user communication
  - Rollback plan tested in advance
```

### 3. Deployment Procedures

**Canary Deployment Pattern**:
```
PHASE 1: CANARY (1% of traffic)
  Duration: 1 hour minimum
  Criteria:
    ✓ Zero critical errors
    ✓ Performance within 10% of baseline
    ✓ User satisfaction maintained
    ✓ No data integrity issues

  If PASS → Proceed to Phase 2
  If FAIL → Automatic rollback

PHASE 2: LIMITED ROLLOUT (10% of traffic)
  Duration: 4 hours minimum
  Criteria:
    ✓ Error rate < 0.1%
    ✓ Performance acceptable
    ✓ Positive user feedback
    ✓ Resource utilization normal

  If PASS → Proceed to Phase 3
  If FAIL → Manual rollback decision

PHASE 3: EXPANDED ROLLOUT (50% of traffic)
  Duration: 24 hours minimum
  Criteria:
    ✓ Stable performance
    ✓ No regression in key metrics
    ✓ User acceptance validated

  If PASS → Proceed to Phase 4
  If FAIL → Rollback and reassess

PHASE 4: FULL DEPLOYMENT (100% of traffic)
  Duration: Permanent
  Monitoring: Continued for 7 days
  Success Criteria:
    ✓ All metrics stable
    ✓ No unexpected issues
    ✓ User satisfaction maintained
```

**Blue-Green Deployment**:
```
PREPARATION:
  1. Deploy new version to GREEN environment
  2. Run full test suite on GREEN
  3. Validate GREEN is production-ready
  4. Keep BLUE (current) running

CUTOVER:
  1. Route small percentage of traffic to GREEN
  2. Monitor for issues (15 minutes)
  3. If stable, route 100% traffic to GREEN
  4. Keep BLUE running for quick rollback

POST-DEPLOYMENT:
  1. Monitor GREEN for 24 hours
  2. If stable, decommission BLUE
  3. If issues, instant rollback to BLUE
  4. GREEN becomes new BLUE for next update
```

### 4. Rollback Procedures

**Automatic Rollback Triggers**:
```
CRITICAL TRIGGERS (Immediate Rollback):
  - Error rate > 5% for 5 minutes
  - Response time > 3x baseline for 10 minutes
  - Critical functionality failure
  - Data corruption detected
  - Security vulnerability introduced

WARNING TRIGGERS (Alert + Manual Decision):
  - Error rate 1-5% sustained
  - Response time 2-3x baseline
  - User satisfaction drop > 20%
  - Resource utilization spike > 80%
  - Unexpected behavior reports

MONITORING WINDOW:
  - First 1 hour: Every 1 minute
  - Hours 1-6: Every 5 minutes
  - Hours 6-24: Every 15 minutes
  - Days 1-7: Every hour
```

**Rollback Execution**:
```
STEP 1: INITIATE ROLLBACK
  - Stop new deployment
  - Preserve logs and metrics
  - Alert development team
  - Begin rollback procedure

STEP 2: SWITCH TO PREVIOUS VERSION
  - Blue-green: Route traffic to old version
  - Canary: Stop new version deployment
  - Rolling: Revert deployed instances

STEP 3: VERIFY ROLLBACK SUCCESS
  - Confirm error rates normal
  - Validate functionality restored
  - Check data integrity
  - Monitor for 30 minutes

STEP 4: POST-ROLLBACK ANALYSIS
  - Root cause investigation
  - Document failure reasons
  - Update rollback procedures
  - Plan corrective actions
```

### 5. Migration Patterns

**Data Migration Framework**:
```
MIGRATION TYPES:

1. ADDITIVE MIGRATION (Safe)
   - Add new fields/capabilities
   - Old data remains valid
   - No transformation needed
   - Example: Adding new task priority field

2. TRANSFORMATIVE MIGRATION (Medium Risk)
   - Convert existing data format
   - Dual-write during transition
   - Validate transformation
   - Example: Converting priority strings to numbers

3. BREAKING MIGRATION (High Risk)
   - Remove or rename fields
   - Require all agents updated
   - Staged migration required
   - Example: Changing task structure fundamentally
```

**Multi-Phase Migration Pattern**:
```
PHASE 1: PREPARATION
  1. Create migration script
  2. Test on production data copy
  3. Validate results
  4. Document rollback procedure
  5. Plan migration timing

PHASE 2: DUAL-WRITE
  1. Deploy code that writes both old and new format
  2. Monitor for data consistency
  3. Validate both formats working
  4. Run for minimum 7 days

PHASE 3: DATA MIGRATION
  1. Run migration script on existing data
  2. Validate all data migrated correctly
  3. Keep old data as backup
  4. Monitor for issues

PHASE 4: DUAL-READ
  1. Deploy code that reads new format first
  2. Fallback to old format if needed
  3. Monitor read patterns
  4. Ensure no old-format reads

PHASE 5: CLEANUP
  1. Remove old format read code
  2. Archive old format data
  3. Remove old format write code
  4. Complete migration
```

**Configuration Migration**:
```yaml
# Old configuration format
agent:
  name: task-agent
  priority_levels: [P1, P2, P3, P4, P5]

# Migration mapping
migration:
  version: "1.0.0 → 2.0.0"
  type: breaking

  transformations:
    - field: priority_levels
      old_format: array_of_strings
      new_format: object_with_metadata

      mapping:
        P1: { level: 0, name: "Critical", urgency: "immediate" }
        P2: { level: 1, name: "High", urgency: "today" }
        P3: { level: 2, name: "Medium", urgency: "this-week" }
        P4: { level: 3, name: "Low", urgency: "this-month" }
        P5: { level: 5, name: "Backlog", urgency: "someday" }

  backward_compatibility:
    - Support reading old format for 90 days
    - Auto-convert on first access
    - Warn users to update configuration

# New configuration format
agent:
  name: task-agent
  priority_framework:
    type: fibonacci_impact
    levels:
      - { level: 0, name: "Critical", urgency: "immediate" }
      - { level: 1, name: "High", urgency: "today" }
      - { level: 2, name: "Medium", urgency: "this-week" }
      - { level: 3, name: "Low", urgency: "this-month" }
      - { level: 5, name: "Backlog", urgency: "someday" }
```

### 6. Backward Compatibility Strategies

**API Versioning**:
```typescript
// Support multiple API versions simultaneously
interface APIEndpoint {
  v1: (params: V1Params) => V1Response;
  v2: (params: V2Params) => V2Response;
  latest: (params: LatestParams) => LatestResponse;
}

// Version detection
function getAPIVersion(request: Request): string {
  return (
    request.headers.get('api-version') ||
    request.query.version ||
    'v1' // Default to oldest for safety
  );
}

// Route to appropriate version
function handleRequest(request: Request) {
  const version = getAPIVersion(request);

  switch (version) {
    case 'v1':
      return handleV1(request);
    case 'v2':
      return handleV2(request);
    default:
      return handleLatest(request);
  }
}
```

**Graceful Degradation**:
```typescript
// New feature with fallback to old behavior
async function processTask(task: Task, options?: NewOptions) {
  // Try new processing method
  if (supportsNewMethod(task)) {
    try {
      return await processWithNewMethod(task, options);
    } catch (error) {
      console.warn('New method failed, falling back', error);
    }
  }

  // Fallback to old, proven method
  return await processWithOldMethod(task);
}

// Feature detection
function supportsNewMethod(task: Task): boolean {
  return (
    task.version >= '2.0.0' &&
    task.hasRequiredFields(['priority', 'metadata'])
  );
}
```

**Deprecation Strategy**:
```typescript
// Mark features as deprecated with warnings
function oldAPIMethod(params: OldParams) {
  console.warn(
    'DEPRECATED: oldAPIMethod will be removed in v3.0.0. ' +
    'Use newAPIMethod instead. ' +
    'Migration guide: https://docs.example.com/migration'
  );

  // Convert old params to new format
  const newParams = convertParams(params);

  // Call new method internally
  return newAPIMethod(newParams);
}

// Track deprecation usage
function trackDeprecationUsage(feature: string) {
  metrics.increment('deprecation_usage', {
    feature,
    caller: getCallerAgent(),
    timestamp: Date.now()
  });
}
```

**Sunset Timeline**:
```
ANNOUNCEMENT (T-90 days):
  - Announce deprecation in release notes
  - Add deprecation warnings to code
  - Publish migration guide
  - Notify all agent maintainers

WARNING PHASE (T-60 days):
  - Increase warning frequency
  - Track usage metrics
  - Provide migration assistance
  - Set hard deadline

GRACE PERIOD (T-30 days):
  - Final warnings
  - Block new usage of deprecated features
  - Existing usage continues with warnings
  - Support for migration questions

REMOVAL (T-0):
  - Remove deprecated features
  - Return clear error messages
  - Provide migration instructions in errors
  - Monitor for impact
```

### 7. Testing Before Update

**Pre-Deployment Testing Checklist**:
```
UNIT TESTS:
  ✓ All unit tests pass
  ✓ Code coverage ≥ 80%
  ✓ New features have tests
  ✓ Edge cases covered

INTEGRATION TESTS:
  ✓ Agent interactions tested
  ✓ Skill dependencies validated
  ✓ Database migrations tested
  ✓ API contracts verified

END-TO-END TESTS:
  ✓ Critical user workflows tested
  ✓ Performance benchmarks met
  ✓ Accessibility validated
  ✓ Cross-browser/device tested

BACKWARD COMPATIBILITY:
  ✓ Old clients still work
  ✓ Configuration migration tested
  ✓ Data migration validated
  ✓ API versioning correct

ROLLBACK PROCEDURE:
  ✓ Rollback tested in staging
  ✓ Rollback timing acceptable
  ✓ Data integrity after rollback
  ✓ Rollback monitoring in place
```

### 8. Post-Update Monitoring

**Monitoring Metrics**:
```
PERFORMANCE METRICS:
  - Response time (p50, p95, p99)
  - Throughput (requests per second)
  - Error rate (total and by type)
  - Resource utilization (CPU, memory, disk)

BUSINESS METRICS:
  - User satisfaction scores
  - Task completion rates
  - Feature adoption rates
  - User engagement levels

TECHNICAL METRICS:
  - API version distribution
  - Deprecation usage counts
  - Migration completion percentage
  - Rollback trigger frequency

MONITORING DURATION:
  - First hour: Real-time monitoring
  - First day: Hourly reviews
  - First week: Daily reviews
  - First month: Weekly reviews
```

**Success Criteria**:
```
UPDATE CONSIDERED SUCCESSFUL IF:
  ✓ Error rate ≤ baseline + 0.1%
  ✓ Performance within 5% of baseline
  ✓ Zero critical issues
  ✓ User satisfaction maintained or improved
  ✓ No data integrity issues
  ✓ Rollback not triggered
  ✓ Adoption rate meets targets
```

## Best Practices

### For Update Planning:
1. **Test Thoroughly**: Never skip testing phases
2. **Communicate Early**: Notify stakeholders in advance
3. **Plan Rollbacks**: Always have a rollback strategy
4. **Monitor Closely**: Watch metrics during deployment
5. **Document Everything**: Record decisions and procedures

### For Backward Compatibility:
1. **Version APIs**: Support multiple versions simultaneously
2. **Deprecate Gracefully**: Give users time to migrate
3. **Maintain Documentation**: Keep migration guides current
4. **Test Compatibility**: Verify old clients work
5. **Provide Migration Tools**: Make transitions easy

### For Rollbacks:
1. **Automate Detection**: Use metrics to trigger rollbacks
2. **Practice Rollbacks**: Test procedures in staging
3. **Keep Data Safe**: Never lose data during rollback
4. **Communicate Status**: Keep users informed
5. **Learn from Failures**: Improve processes after rollbacks

## Integration with Other Skills

- **avi-architecture**: Understand system architecture for updates
- **code-standards**: Maintain quality during updates
- **testing-patterns**: Comprehensive testing before deployment
- **documentation-standards**: Document update procedures
- **monitoring-frameworks**: Track update success

## Success Metrics

- **Update Success Rate**: >95% of updates deploy without rollback
- **Rollback Time**: <5 minutes to rollback if needed
- **Migration Success**: 100% data migrated without loss
- **Compatibility Window**: 90 days minimum backward compatibility
- **Zero Downtime**: All updates deployed without service interruption
- **User Impact**: <0.1% user complaints per update

## References

- [versioning-guide.md](versioning-guide.md) - Semantic versioning details
- [deployment-playbooks.md](deployment-playbooks.md) - Step-by-step procedures
- [rollback-procedures.md](rollback-procedures.md) - Rollback execution guides
- [migration-templates.md](migration-templates.md) - Migration script templates
- [monitoring-dashboards.md](monitoring-dashboards.md) - Update monitoring setup

---

**Remember**: Updates should improve the system, not disrupt it. Plan carefully, test thoroughly, deploy cautiously, monitor continuously, and be ready to rollback instantly. The best updates are the ones users don't even notice happening.
