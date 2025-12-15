# SPARC Specification: Fibonacci Priority System Refactoring

## Executive Summary

**Objective**: Refactor the Fibonacci priority system implementation to correctly represent its purpose as a scarcity constraint forcing function, while separating effort/impact assessment concerns into the productivity-patterns skill.

**SPARC Phase**: Phase 1 - Specification
**Methodology**: TDD with Claude-Flow Swarm coordination
**Validation**: ALL 201 tests must pass

---

## Phase 1: SPECIFICATION

### 1.1 Problem Statement

**Current State Issues**:
- task-management skill incorrectly maps Fibonacci priorities to effort/impact
- Fibonacci sequence conflated with business value assessment
- User feedback indicates misunderstanding of Fibonacci as forcing function
- Effort/impact framework mixed into priority assignment logic

**User Feedback Analysis**:
> "Fibonacci is a **forcing function for scarcity**, not a business impact calculator"

This reveals the core misunderstanding: the current implementation treats Fibonacci priorities as indicators of business value, when they should represent psychological constraints that force prioritization discipline.

### 1.2 Requirements

#### 1.2.1 task-management Skill Requirements

**MUST HAVE**:
1. **Abstract Fibonacci Explanation**:
   - Explain Fibonacci as infinite sequence: P0, P1, P2, P3, P5, P8, P13, P21...
   - Emphasize expanding gaps as psychological forcing function
   - Note P8 as practical ceiling for most users
   - ZERO mention of effort/impact/business value
   - NO user scenario examples

2. **Key Conceptual Points**:
   ```
   P0, P1, P2, P3 (gaps: 1, 1, 1) - Small gaps, easy to use
   P3, P5, P8 (gaps: 2, 3) - Growing gaps force harder choices
   P8, P13, P21 (gaps: 5, 8) - Increasingly rare to justify
   Pattern continues infinitely, but P8 is practical ceiling
   ```

3. **Content to REMOVE**:
   - All timeframe mappings (0-1 hours, 1-8 hours, etc.)
   - All effort/impact scoring tables
   - All business value assessments
   - All "Use Cases" and "Examples" columns from priority table
   - Impact scoring functions and calculation logic

4. **Content to RETAIN**:
   - Task schema structure
   - Task templates
   - Dependency management
   - Workflow states
   - Priority escalation (refactored to reference scarcity only)
   - Agent integration patterns

#### 1.2.2 productivity-patterns Skill Requirements

**MUST HAVE**:
1. **New Section**: "Effort/Impact Assessment Framework"
   - Position after "Core Productivity Frameworks"
   - Move all effort/impact content FROM task-management
   - Integrate with Eisenhower Matrix (already present)
   - Separate decision-making tool, not tied to Fibonacci

2. **Content Structure**:
   ```markdown
   ## Effort/Impact Assessment Framework

   ### Purpose
   - Separate from priority assignment
   - Tool for strategic decision-making
   - Complements productivity frameworks

   ### Impact Scoring (1-10 Scale)
   [Move content from task-management lines 98-123]

   ### Effort Assessment
   - Timeframe estimation guidelines
   - Complexity analysis
   - Resource requirements

   ### Integration with Eisenhower Matrix
   - Combine urgency/importance with effort/impact
   - Decision matrix for task planning
   ```

3. **Content to ADD**:
   - All impact scoring criteria from task-management
   - Effort estimation guidelines
   - Strategic value assessment methods
   - Integration patterns with existing frameworks

#### 1.2.3 Test Suite Requirements

**Phase 2 Tests to Update**:
1. **task-management tests** (lines 139-205):
   - Remove assertions for timeframes
   - Remove assertions for effort/impact mappings
   - Add assertions for abstract Fibonacci explanation
   - Add assertion for infinite sequence concept
   - Add assertion for P8 practical ceiling mention
   - Update line count expectations (content reduced)

2. **productivity-patterns tests** (lines 207-261):
   - Add assertions for new "Effort/Impact Assessment Framework" section
   - Verify impact scoring content present
   - Verify effort estimation guidelines present
   - Update line count expectations (content increased)

3. **Cross-skill validation** (lines 419-495):
   - Update total line count expectations
   - Verify no broken cross-references
   - Ensure separation of concerns maintained

**Regression Requirements**:
- ALL 201 existing tests must pass
- Zero test mocks (100% real implementation)
- Zero placeholders in implementation

### 1.3 Success Criteria

**Functional Requirements**:
- ✅ Fibonacci explanation is abstract and infinite
- ✅ P8 noted as practical ceiling
- ✅ Zero effort/impact content in task-management
- ✅ Effort/impact framework cleanly integrated into productivity-patterns
- ✅ All cross-references updated and valid

**Quality Requirements**:
- ✅ ALL 201 tests passing
- ✅ Zero placeholders
- ✅ Zero mocks
- ✅ Proper markdown structure maintained
- ✅ Frontmatter valid
- ✅ Line counts within tolerance ranges

**Documentation Requirements**:
- ✅ NLD decisions documented
- ✅ Architecture rationale captured
- ✅ Test strategy validated
- ✅ Final validation report complete

### 1.4 Non-Functional Requirements

**Performance**:
- Test execution time < 30 seconds
- No file system performance degradation

**Maintainability**:
- Clear separation of concerns
- Self-documenting content structure
- Minimal cross-skill dependencies

**Extensibility**:
- Effort/impact framework can evolve independently
- Fibonacci explanation remains stable
- New productivity patterns easily addable

---

## Phase 2: PSEUDOCODE (Preview)

### 2.1 Refactoring Algorithm

```
FUNCTION refactorFibonacciImplementation():

  // Phase 1: Extract effort/impact content
  effortImpactContent = extractFromTaskManagement([
    "Impact Scoring (1-10 Scale)",
    "Calculating Impact",
    "Business value criteria"
  ])

  // Phase 2: Rewrite Fibonacci section
  newFibonacciExplanation = createAbstractExplanation([
    "Infinite sequence concept",
    "Psychological forcing function",
    "Gap expansion pattern",
    "P8 practical ceiling"
  ])

  // Phase 3: Update task-management
  taskManagementUpdated = replaceContent(
    taskManagement,
    "Priority Levels (P0-P8)" section,
    newFibonacciExplanation
  )

  // Phase 4: Enhance productivity-patterns
  productivityPatternsEnhanced = addSection(
    productivityPatterns,
    "Effort/Impact Assessment Framework",
    effortImpactContent
  )

  // Phase 5: Update tests
  testsUpdated = updateAssertions([
    taskManagementTests,
    productivityPatternsTests
  ])

  RETURN {
    taskManagement: taskManagementUpdated,
    productivityPatterns: productivityPatternsEnhanced,
    tests: testsUpdated
  }
END FUNCTION
```

### 2.2 Content Migration Map

```
FROM: task-management SKILL.md
  Lines 26-71: Priority Levels table and criteria
  Lines 98-123: Impact Scoring section

TO: productivity-patterns SKILL.md
  NEW Section (after line 23): Effort/Impact Assessment Framework

REPLACE IN: task-management SKILL.md
  Lines 26-71: Abstract Fibonacci explanation (no timeframes/examples)

UPDATE: phase2-skills.test.ts
  Lines 186-199: Priority level assertions (remove timeframe checks)
  Lines 245-249: Line count expectations (adjust tolerance)
```

---

## Phase 3: ARCHITECTURE (Preview)

### 3.1 Test Update Strategy

**TDD Approach**:
1. Update tests FIRST (fail fast)
2. Run test suite (expect failures)
3. Implement changes
4. Run tests again (expect pass)
5. Regression validation (201/201)

**Test Execution Order**:
```
1. Update task-management tests → RUN (should fail)
2. Update productivity-patterns tests → RUN (should fail)
3. Update cross-skill validation tests → RUN (should fail)
4. Implement task-management changes → RUN (task-management pass)
5. Implement productivity-patterns changes → RUN (all pass)
6. Regression suite → RUN (201/201 pass)
```

### 3.2 Swarm Coordination Strategy

**Agent Roles**:
1. **Spec Agent** (this phase): Document requirements
2. **Test Agent**: Update test suite first (TDD)
3. **Refactor Agent**: Implement task-management changes
4. **Enhancement Agent**: Implement productivity-patterns changes
5. **Validation Agent**: Run regression suite

**Parallel Execution**:
- Test Agent and Refactor Agent can work concurrently after spec complete
- Enhancement Agent depends on content extraction from Refactor Agent
- Validation Agent runs last after all changes complete

---

## Phase 4: REFINEMENT (Preview)

### 4.1 Implementation Checklist

**task-management SKILL.md**:
- [ ] Remove lines 26-71 (old priority table)
- [ ] Insert abstract Fibonacci explanation
- [ ] Remove lines 98-123 (impact scoring)
- [ ] Update priority escalation logic (lines 246-290)
- [ ] Verify no broken references

**productivity-patterns SKILL.md**:
- [ ] Add "Effort/Impact Assessment Framework" section
- [ ] Insert extracted impact scoring content
- [ ] Add effort estimation guidelines
- [ ] Integrate with Eisenhower Matrix section
- [ ] Update cross-references

**phase2-skills.test.ts**:
- [ ] Update task-management assertions (lines 186-199)
- [ ] Update productivity-patterns assertions (lines 245-261)
- [ ] Update line count expectations (lines 180-184, 245-249)
- [ ] Update total line count validation (lines 480-494)

### 4.2 Quality Gates

**Gate 1: Test Updates Complete**
- All test assertions updated
- Tests fail with current implementation
- Test logic validated

**Gate 2: task-management Refactored**
- Content removed/replaced
- Fibonacci explanation abstract
- task-management tests pass

**Gate 3: productivity-patterns Enhanced**
- New section added
- Content migrated
- productivity-patterns tests pass

**Gate 4: Regression Validated**
- ALL 201 tests pass
- Zero placeholders
- Zero mocks

---

## Phase 5: COMPLETION (Preview)

### 5.1 Validation Protocol

**Test Execution**:
```bash
cd /workspaces/agent-feed/tests/skills
npm test -- phase2-skills.test.ts
```

**Expected Results**:
```
Test Suites: 1 passed, 1 total
Tests:       35 passed, 35 total
Time:        < 30s
```

**Regression Execution**:
```bash
cd /workspaces/agent-feed
npm test
```

**Expected Results**:
```
All Tests: 201 passed, 201 total
Coverage: 100% (no mocks)
```

### 5.2 Deliverables

1. ✅ Updated task-management skill with correct Fibonacci explanation
2. ✅ Enhanced productivity-patterns skill with effort/impact framework
3. ✅ Updated test suite (all passing)
4. ✅ Regression validation (201/201 tests passing)
5. ✅ Final validation report

---

## Appendix A: Detailed Content Changes

### A.1 task-management BEFORE (lines 26-71)

```markdown
### Priority Levels (P0-P8)

| Priority | Name | Timeframe | Use Cases | Examples |
|----------|------|-----------|-----------|----------|
| **P0** | Critical | 0-1 hours | System down, revenue blocking, emergency | Production outage, security breach |
| **P1** | High/Urgent | 1-8 hours | Key deadlines, strategic initiatives | Important meeting prep, client deliverable |
...
```

### A.2 task-management AFTER (proposed)

```markdown
### Priority Levels: Fibonacci as Forcing Function

The Fibonacci priority system (P0, P1, P2, P3, P5, P8, P13, P21...) is an **infinite sequence** designed as a **psychological forcing function** to enforce prioritization discipline through scarcity.

**How the Forcing Function Works**:

The expanding gaps between priority levels make it increasingly difficult to justify using higher priorities, preventing "everything is P1" syndrome:

- **P0, P1, P2, P3** (gaps: 1, 1, 1) - Small gaps, easy to use for urgent work
- **P3, P5, P8** (gaps: 2, 3) - Growing gaps force harder prioritization choices
- **P8, P13, P21** (gaps: 5, 8) - Increasingly rare to justify, reserved for exceptional cases

**Practical Application**:
- The sequence continues infinitely (P21, P34, P55, P89...)
- **P8 is the practical ceiling** for most users and teams
- Most work falls naturally into P1-P5 range
- The expanding gaps prevent priority inflation

**Key Principle**: The scarcity constraint forces you to make hard trade-offs rather than marking everything as high priority.
```

### A.3 productivity-patterns AFTER (new section)

```markdown
## Effort/Impact Assessment Framework

### Purpose
The Effort/Impact Assessment Framework provides a separate, strategic decision-making tool for evaluating task value and resource requirements. This framework operates independently from priority assignment and complements productivity frameworks like GTD and the Eisenhower Matrix.

### Impact Scoring (1-10 Scale)

**Impact Score Criteria**:
- **10**: Transformational business impact, multi-million dollar value
- **8**: High business value, significant user impact
- **5**: Moderate impact, team-level improvement
- **3**: Low impact, individual productivity gain
- **1**: Minimal impact, nice-to-have

**Calculating Impact**:
```javascript
function calculateImpact(task) {
  let score = 0;

  // Business value
  if (task.affectsRevenue) score += 3;
  if (task.affectsUserExperience) score += 2;
  if (task.affectsTeamProductivity) score += 1;

  // Urgency
  if (task.hasDeadline) score += 2;
  if (task.isBlocking) score += 2;

  return Math.min(score, 10);
}
```

### Effort Assessment

**Timeframe Guidelines**:
- **0-2 hours**: Quick fixes, minor updates
- **2-8 hours**: Standard features, moderate complexity
- **1-3 days**: Complex features, significant refactoring
- **1-2 weeks**: Major initiatives, architectural changes
- **1+ months**: Strategic projects, system redesigns

### Integration with Eisenhower Matrix

Combine effort/impact assessment with the Eisenhower Matrix for comprehensive decision-making:

```javascript
function strategicTaskPlanning(task) {
  const impact = calculateImpact(task);
  const effort = estimateEffort(task);
  const urgency = assessUrgency(task);

  return {
    eisenhowerQuadrant: categorizeByUrgencyImportance(urgency, impact),
    effortImpactRatio: impact / effort,
    recommendedAction: determineAction(impact, effort, urgency)
  };
}
```
```

---

## Appendix B: Test Update Specifications

### B.1 task-management Test Updates

**REMOVE these assertions**:
```typescript
// Lines 196-199 (remove timeframe checks)
expect(skillContent).toMatch(/P0.*0-1 hours/i);
expect(skillContent).toMatch(/P1.*1-8 hours/i);
```

**ADD these assertions**:
```typescript
it('should explain Fibonacci as infinite sequence', () => {
  expect(skillContent).toMatch(/infinite\s+sequence/i);
  expect(skillContent).toContain('P0, P1, P2, P3, P5, P8, P13, P21');
});

it('should emphasize Fibonacci as forcing function', () => {
  expect(skillContent).toMatch(/forcing\s+function/i);
  expect(skillContent).toMatch(/scarcity/i);
  expect(skillContent).toMatch(/expanding\s+gaps/i);
});

it('should note P8 as practical ceiling', () => {
  expect(skillContent).toMatch(/P8.*practical\s+ceiling/i);
});

it('should NOT contain effort/impact mappings', () => {
  expect(skillContent).not.toMatch(/0-1\s+hours/i);
  expect(skillContent).not.toMatch(/Timeframe/);
  expect(skillContent).not.toMatch(/Use\s+Cases.*Examples/);
});
```

### B.2 productivity-patterns Test Updates

**ADD these assertions**:
```typescript
it('should have Effort/Impact Assessment Framework section', () => {
  expect(skillContent).toContain('## Effort/Impact Assessment Framework');
  expect(skillContent).toContain('### Impact Scoring (1-10 Scale)');
  expect(skillContent).toContain('### Effort Assessment');
});

it('should include impact calculation logic', () => {
  expect(skillContent).toContain('function calculateImpact');
  expect(skillContent).toMatch(/affectsRevenue|affectsUserExperience/);
});

it('should integrate with Eisenhower Matrix', () => {
  expect(skillContent).toMatch(/Integration.*Eisenhower/i);
});
```

### B.3 Line Count Updates

**task-management** (current: 457 lines):
- Remove ~75 lines (priority table + impact scoring)
- Add ~40 lines (abstract Fibonacci explanation)
- **Expected: ~422 lines** (allow tolerance: 410-435)

**productivity-patterns** (current: 580 lines):
- Add ~90 lines (effort/impact framework)
- **Expected: ~670 lines** (allow tolerance: 660-680)

**Total change**: Net +55 lines across both skills

---

## Appendix C: NLD Decision Log

### Decision 1: Separation of Concerns
**Rationale**: Fibonacci priorities represent scarcity constraints, not business value. Mixing these concepts creates confusion and undermines the psychological forcing function.

**Alternative Considered**: Keep unified but add clarifying text.
**Rejected Because**: User feedback indicates fundamental misunderstanding requires structural separation.

### Decision 2: Abstract vs Concrete Fibonacci Explanation
**Rationale**: Abstract explanation (infinite sequence) emphasizes concept over implementation, preventing future confusion with specific use cases.

**Alternative Considered**: Provide concrete examples for each priority level.
**Rejected Because**: Concrete examples led to current misunderstanding; abstract explanation better communicates forcing function concept.

### Decision 3: Test-First Implementation
**Rationale**: TDD ensures specification drives implementation, preventing scope creep and maintaining quality.

**Alternative Considered**: Implement first, then update tests.
**Rejected Because**: Violates TDD methodology and increases risk of regression failures.

### Decision 4: Swarm-Based Execution
**Rationale**: Parallel agent execution accelerates delivery while maintaining quality through independent validation.

**Alternative Considered**: Sequential single-agent implementation.
**Rejected Because**: User explicitly requested swarm coordination; sequential approach slower.

---

**End of SPARC Phase 1: Specification**

**Next Phase**: Phase 2 - Pseudocode (detailed algorithm design)

**Status**: ✅ COMPLETE
**Validation**: Ready for phase gate review
**Sign-off**: Awaiting approval to proceed to Phase 2
