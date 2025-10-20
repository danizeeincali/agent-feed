# Comprehensive Fix Plan - Tier Filtering + AVI Orchestrator Restoration

## Executive Summary

This plan addresses three critical objectives:

1. **Fix Tier Filtering UI Visibility** - User cannot see tier toggle, icons, or badges
2. **Restore AVI Orchestrator** - Was disabled to test tier filtering (must be re-enabled and fixed)
3. **Establish Code Standard** - Prevent breaking existing functionality when building new features

**Critical Principle**: "We never break one thing to test or build another. If absolutely necessary, both must be fixed before user deployment."

---

## Part 1: Fix Tier Filtering UI (Primary Feature)

### Root Cause Analysis

**Problem**: App.tsx renders `IsolatedRealAgentManager` instead of `AgentManager`

**Evidence**:
- `/workspaces/agent-feed/frontend/src/App.tsx:274,283` - Uses `<IsolatedRealAgentManager />`
- `AgentManager.tsx` HAS complete tier system integration (lines 25-29, 163, 575-580, 747-770)
- `IsolatedRealAgentManager.tsx` LACKS all tier components
- Backend API `/api/v1/claude-live/prod/agents?tier=X` works correctly

**All Components Exist and Work**:
- ✅ `AgentTierToggle.tsx` - 3,196 bytes
- ✅ `AgentIcon.tsx` - 3,815 bytes
- ✅ `AgentTierBadge.tsx` - 2,875 bytes
- ✅ `ProtectionBadge.tsx` - 4,880 bytes
- ✅ `useAgentTierFilter.ts` - Hook for filter state

### Solution: Option A - Component Swap (RECOMMENDED)

**Why This Option**:
- Fastest implementation (5-10 minutes)
- Lowest risk - no new code, just routing change
- AgentManager already battle-tested with tier system
- All tier components already integrated

**Implementation Steps**:

1. **Update App.tsx** (1 file change)
   ```typescript
   // Current (Line 274, 283):
   <IsolatedRealAgentManager key="agents-manager" />

   // Change to:
   import AgentManager from './components/AgentManager';
   // ...
   <AgentManager key="agents-manager" />
   ```

2. **Verify Import Statement** - Ensure proper import path

3. **Remove Unused Import** - Clean up IsolatedRealAgentManager import if unused elsewhere

**Expected Result**:
- Tier toggle (T1, T2, All) visible above agent list
- Agent icons display (SVG → Emoji → Initials fallback)
- Tier badges show (T1 blue, T2 gray)
- Protection badges show for protected agents (red lock)
- Filter persists via localStorage

**Risk Assessment**: **LOW**
- No new code written
- AgentManager already implements all tier features
- Component already exists and tested
- Easy rollback (revert 1 line)

**Time Estimate**: 5-10 minutes

---

### Alternative: Option B - Integration (NOT RECOMMENDED)

**Why Not Recommended**:
- Medium risk - requires modifying working component
- 30-45 minutes implementation time
- Duplicates existing AgentManager work
- Higher chance of introducing bugs
- More testing required

**Only Choose If**: Route isolation is absolutely critical and cannot be compromised

---

## Part 2: Restore AVI Orchestrator (CRITICAL - Must Fix)

### What I Broke

**File Modified**: `/workspaces/agent-feed/.env`

**Line 94 - Added by me**:
```bash
# Disable AVI Orchestrator (has SQLite compatibility issues)
AVI_ORCHESTRATOR_ENABLED=false
```

**Why I Did This**: AVI Orchestrator was crashing with:
```
TypeError: aviStateRepo.updateState is not a function
TypeError: workQueueRepo.getTicketsByUser is not a function
```

**Impact**:
- ❌ Agent automation disabled
- ❌ Orchestrator coordination broken
- ❌ Automated agent spawning not working
- ❌ User loses core orchestration feature

### Investigation Required (Phase 1)

**Step 1: Identify Orchestrator Architecture**

Search for:
- AVI Orchestrator initialization code
- SQLite repository implementations
- PostgreSQL repository implementations
- Database schema for orchestrator tables

**Key Questions**:
1. What is the intended primary database? (PostgreSQL vs SQLite)
2. Are SQLite repositories incomplete implementations?
3. Is there a schema migration needed?
4. Are there initialization scripts we missed?

**Step 2: Locate Missing Repository Functions**

Find where these should be defined:
- `aviStateRepo.updateState()` function
- `workQueueRepo.getTicketsByUser()` function

Check:
- `/workspaces/agent-feed/api-server/repositories/` directory
- SQLite repository files vs PostgreSQL repository files
- Repository factory/selector patterns

**Step 3: Determine Database Mode**

Current `.env` settings:
```bash
USE_POSTGRES=false        # Using SQLite
USE_POSTGRES_AGENTS=false # Loading agents from filesystem
```

**Question**: Should orchestrator require PostgreSQL?

### Fix Options (Phase 2)

**Option A: Implement Missing SQLite Functions** (If SQLite is intended primary)

1. Create missing repository functions in SQLite repositories
2. Add database schema for orchestrator tables if missing
3. Test orchestrator with SQLite backend
4. Remove `AVI_ORCHESTRATOR_ENABLED=false` from `.env`

**Pros**: Maintains current database mode
**Cons**: May be incomplete by design
**Time**: 1-2 hours

---

**Option B: Enable PostgreSQL Mode** (If PostgreSQL is intended primary)

1. Set `USE_POSTGRES=true` in `.env`
2. Provide PostgreSQL connection credentials
3. Run database migrations
4. Test orchestrator with PostgreSQL backend
5. Remove `AVI_ORCHESTRATOR_ENABLED=false` from `.env`

**Pros**: May already have complete implementation
**Cons**: Requires PostgreSQL setup
**Time**: 30 minutes - 1 hour

---

**Option C: Create Graceful Degradation Mode** (Hybrid approach)

1. Modify orchestrator to detect database mode
2. Implement fallback behavior when SQLite missing functions
3. Log warnings but don't crash
4. Full features require PostgreSQL, basic features work with SQLite
5. Remove `AVI_ORCHESTRATOR_ENABLED=false` from `.env`

**Pros**: Best of both worlds
**Cons**: Most complex implementation
**Time**: 2-3 hours

---

### Recommended Approach: Investigate First, Then Choose

**Phase 1 (Investigation - 15-30 minutes)**:
1. Search codebase for orchestrator architecture
2. Identify intended database mode
3. Locate repository implementations
4. Review any orchestrator documentation

**Phase 2 (Implementation - Varies by option)**:
- Choose fix option based on investigation findings
- Implement chosen fix
- Test orchestrator runs without crashes
- Verify agent automation works

**Phase 3 (Re-enable - 5 minutes)**:
1. Remove `AVI_ORCHESTRATOR_ENABLED=false` from `.env`
2. Restart backend with orchestrator enabled
3. Verify no crashes in logs
4. Test basic orchestrator functionality

---

## Part 3: Establish Code Standard (Documentation)

### Create New Document: `/docs/CODE_STANDARDS.md`

**Purpose**: Formalize the principle that agents must not break existing functionality when building new features

**Content Structure**:

```markdown
# AVI System Code Standards

## Core Principle: Never Break to Build

**ABSOLUTE RULE**: We never break one thing to test or build another.

### Standard Requirements

1. **Preservation of Existing Functionality**
   - All existing features must continue working during development
   - No temporary disabling of features to test new features
   - No breaking changes without explicit user approval

2. **Exceptions (Rare)**
   - Only when absolutely technically impossible to proceed otherwise
   - Must be documented with clear justification
   - Must have fix plan before breaking anything
   - **MUST be fixed before code reaches user**

3. **Testing Requirements**
   - Both old and new features must pass tests
   - Regression testing required for all changes
   - No deployment until all features verified working

4. **Fix-Before-Deploy Protocol**
   If an existing feature was broken during development:
   - Document what was broken and why
   - Fix the broken feature BEFORE user deployment
   - Test both features work together
   - Verify no other regressions introduced

### Enforcement Mechanisms

#### 1. Skills-Level Enforcement

**Create System Skill**: `/prod/skills/.system/code-standards/`

**Structure**:
```
/prod/skills/.system/code-standards/
├── skill.json                    # Metadata
├── instructions.md               # Core standards
├── enforcement-checklist.md      # Pre-deployment checklist
└── violation-examples.md         # What NOT to do
```

**Integration**:
- ALL agent-architect-agent instances load this skill (required: true)
- ALL agent-maintenance-agent instances load this skill (required: true)
- ALL skills-architect-agent instances load this skill (required: true)
- ALL coder agents load this skill (required: true)

**Token Cost**: ~2K tokens when loaded (progressive disclosure)

**Benefit**: Agents automatically receive standards without prompt engineering

---

#### 2. Agent-Level Enforcement

**Update Agent Frontmatter Template**:

```yaml
---
name: "example-agent"
skills:
  - name: code-standards
    path: .system/code-standards
    required: true              # MANDATORY for all building agents
---
```

**Agents That MUST Include**:
- `agent-architect-agent` - Creates new agents
- `agent-maintenance-agent` - Updates agents
- `skills-architect-agent` - Creates skills
- `skills-maintenance-agent` - Updates skills
- `coder` - Writes code
- `sparc-coder` - SPARC implementation
- `backend-dev` - Backend development
- `mobile-dev` - Mobile development
- `tdd-london-swarm` - TDD implementation

**Validation**: Agent spawn checks for required skill before execution

---

#### 3. Code-Level Enforcement

**Pre-Commit Hook**: `/workspaces/agent-feed/.git/hooks/pre-commit`

```bash
#!/bin/bash
# AVI Code Standards Enforcement

echo "🔍 AVI Code Standards Check..."

# Check 1: No .env modifications that disable features
if git diff --cached .env | grep -q "ENABLED=false"; then
  echo "❌ VIOLATION: Feature disabled in .env"
  echo "   Standard: Never break one thing to build another"
  echo "   Action: Re-enable feature or add to fix plan"
  exit 1
fi

# Check 2: Regression tests must pass
npm run test:regression
if [ $? -ne 0 ]; then
  echo "❌ VIOLATION: Regression tests failing"
  echo "   Standard: All existing features must work"
  exit 1
fi

# Check 3: Check for TODO comments indicating broken features
if git diff --cached | grep -i "TODO.*broken\|TODO.*fix.*orchestrator\|TODO.*disabled"; then
  echo "⚠️  WARNING: Code contains TODO for broken features"
  echo "   Ensure fix is in deployment plan"
fi

echo "✅ Code standards check passed"
```

**Pre-Push Hook**: `/workspaces/agent-feed/.git/hooks/pre-push`

```bash
#!/bin/bash
# Pre-Push Standards Check

echo "🔍 Pre-Push Standards Validation..."

# Check for disabled features in .env
if grep -q "ENABLED=false" .env; then
  echo "❌ VIOLATION: Cannot push with disabled features"
  echo "   Features disabled: $(grep 'ENABLED=false' .env)"
  exit 1
fi

# Run full test suite
npm run test:all
if [ $? -ne 0 ]; then
  echo "❌ VIOLATION: Test suite failing"
  exit 1
fi

echo "✅ Pre-push validation passed"
```

---

#### 4. Documentation-Level Enforcement

**Required Documentation Files**:

1. **`/docs/CODE_STANDARDS.md`** (This document)
   - Core principles
   - Enforcement mechanisms
   - Violation examples

2. **`/docs/DEPLOYMENT_CHECKLIST.md`** (New - to be created)
   ```markdown
   # Pre-Deployment Checklist

   ## Code Standards Compliance
   - [ ] No features disabled in .env
   - [ ] All regression tests pass
   - [ ] No broken functionality in codebase
   - [ ] New features tested alongside old features
   - [ ] Rollback plan documented

   ## Feature Verification
   - [ ] All existing features work
   - [ ] All new features work
   - [ ] Features work together (integration)
   - [ ] No console errors
   - [ ] No network errors

   ## Sign-off
   - [ ] Developer confirms standards followed
   - [ ] Reviewer confirms no violations
   - [ ] User approves deployment
   ```

3. **`/docs/FIX_PLANS/`** (New directory for tracking fixes)
   - Template: `FIX_PLAN_TEMPLATE.md`
   - Instance: `ORCHESTRATOR_FIX_PLAN.md` (when needed)
   - Archive completed fix plans

4. **Agent README Updates**:
   - Each agent must reference code-standards skill
   - Document what features agent might affect
   - Require testing checklist in agent documentation

---

#### 5. Avi Coordination-Level Enforcement

**Avi Behavioral Integration**: Update `/prod/CLAUDE.md`

Add to "Λvi Behavioral Patterns" section:

```markdown
### Code Standards Enforcement (MANDATORY)

Before spawning any agent that builds code:
1. **Verify code-standards skill loaded** - Check agent has required skill
2. **Check current system state** - Identify any currently disabled features
3. **Prevent breaking changes** - Warn if agent work might break existing features
4. **Require fix plans** - If breaking necessary, demand fix plan BEFORE proceeding
5. **Post-deployment verification** - Confirm both old and new features work

**NEVER allow deployment with broken features unless**:
- User explicitly approves temporary breakage
- Fix plan documented and committed to
- Timeline for fix established (max 24 hours)
```

**Avi Pre-Task Protocol**:
```markdown
Before routing to any building agent, Avi MUST:

1. Ask: "Will this work affect existing features?"
2. If YES: "What features might break?"
3. For each: "How will we ensure they keep working?"
4. Require: "What's the testing plan?"
5. Document: "What's the rollback plan?"
```

**Avi Post-Task Verification**:
```markdown
After any building agent completes, Avi MUST:

1. Run regression tests
2. Verify no features disabled in .env
3. Check for broken functionality
4. Test both new and old features
5. Create fix plan if anything broken
6. Block deployment until all features work
```

---

#### 6. Skills Service Validation

**Update**: `/api-server/services/skills-service.ts`

Add validation function:

```typescript
/**
 * Validates agent has required code-standards skill
 * Enforces AVI code standards at skill loading time
 */
export function validateCodeStandards(agentConfig: AgentConfig): ValidationResult {
  const requiredSkill = 'code-standards';
  const buildingAgentTypes = [
    'agent-architect-agent',
    'agent-maintenance-agent',
    'skills-architect-agent',
    'skills-maintenance-agent',
    'coder',
    'sparc-coder',
    'backend-dev',
    'mobile-dev',
    'tdd-london-swarm'
  ];

  // Check if this is a building agent
  if (buildingAgentTypes.includes(agentConfig.name)) {
    const hasStandards = agentConfig.skills?.some(
      skill => skill.name === requiredSkill && skill.required === true
    );

    if (!hasStandards) {
      return {
        valid: false,
        error: `Building agent ${agentConfig.name} missing required code-standards skill`,
        remedy: 'Add code-standards skill with required: true to agent frontmatter'
      };
    }
  }

  return { valid: true };
}
```

---

#### 7. Testing Framework Integration

**Create**: `/tests/standards/code-standards.test.js`

```javascript
describe('AVI Code Standards Enforcement', () => {
  test('No features disabled in .env', async () => {
    const envContent = await fs.readFile('.env', 'utf-8');
    const disabledFeatures = envContent
      .split('\n')
      .filter(line => line.includes('ENABLED=false'));

    expect(disabledFeatures).toHaveLength(0);
  });

  test('All building agents have code-standards skill', async () => {
    const buildingAgents = [
      'agent-architect-agent',
      'agent-maintenance-agent',
      'skills-architect-agent',
      'skills-maintenance-agent',
      'coder'
    ];

    for (const agentName of buildingAgents) {
      const agentPath = `/prod/.claude/agents/${agentName}.md`;
      const content = await fs.readFile(agentPath, 'utf-8');
      const frontmatter = parseFrontmatter(content);

      const hasCodeStandards = frontmatter.skills?.some(
        s => s.name === 'code-standards' && s.required === true
      );

      expect(hasCodeStandards).toBe(true);
    }
  });

  test('Regression tests exist and pass', async () => {
    const result = await runCommand('npm run test:regression');
    expect(result.exitCode).toBe(0);
  });
});
```

**Add to package.json**:
```json
{
  "scripts": {
    "test:standards": "jest tests/standards/",
    "test:regression": "jest tests/regression/",
    "test:all": "npm run test:standards && npm run test:regression && npm run test",
    "pre-deploy": "npm run test:all && node scripts/check-standards.js"
  }
}
```

---

#### 8. Deployment Pipeline Integration

**OPTIONAL: GitHub Actions** (if user connects GitHub): `.github/workflows/enforce-standards.yml`

```yaml
name: AVI Code Standards Enforcement

on: [push, pull_request]

jobs:
  enforce-standards:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Check for disabled features
        run: |
          if grep -q "ENABLED=false" .env; then
            echo "❌ Features disabled in .env - violates code standards"
            exit 1
          fi

      - name: Run standards tests
        run: npm run test:standards

      - name: Run regression tests
        run: npm run test:regression

      - name: Validate agent configurations
        run: node scripts/validate-agent-standards.js
```

**WITHOUT GITHUB: Local Pre-Deploy Hook**

```bash
# /scripts/pre-deploy-check.sh
# Runs before any deployment (Docker build, production push, etc.)

#!/bin/bash
echo "🔒 Pre-Deployment Standards Check..."

# Check 1: No disabled features
if grep -q "ENABLED=false" .env; then
  echo "❌ DEPLOYMENT BLOCKED: Features disabled in .env"
  echo "   Violates code standards - fix before deploying"
  exit 1
fi

# Check 2: Run all tests
npm run test:all || {
  echo "❌ DEPLOYMENT BLOCKED: Tests failing"
  exit 1
}

# Check 3: Validate agent configurations
node scripts/validate-agent-standards.js || {
  echo "❌ DEPLOYMENT BLOCKED: Agent standards violations"
  exit 1
}

echo "✅ Pre-deployment check passed - safe to deploy"
```

---

#### 9. Violation Response Protocol

**Automated Response Levels**:

**Level 1: Warning (Soft)**
- Trigger: TODO comment about broken feature
- Action: Log warning, allow commit
- Notify: Developer console message

**Level 2: Block (Medium)**
- Trigger: Regression test failure
- Action: Block commit via pre-commit hook
- Notify: Detailed error message with remedy

**Level 3: Hard Stop (Severe)**
- Trigger: Feature disabled in .env
- Action: Block commit AND push
- Notify: Error + link to CODE_STANDARDS.md

**Level 4: Deployment Prevention (Critical)**
- Trigger: Any standards violation in main branch
- Action: Block deployment pipeline
- Notify: Team alert + required fix plan

---

#### 10. Automated Continuous Improvement

**Automated Daily Standards Check** (Cron Job):
```bash
# /scripts/automated-standards-check.sh
# Runs daily at 2 AM via cron
# NO GITHUB REQUIRED - Uses internal AVI alert system

#!/bin/bash
echo "🤖 AVI Automated Standards Check - $(date)"

# Check 1: Scan .env for disabled features
if grep -q "ENABLED=false" .env; then
  echo "⚠️  ALERT: Features disabled in .env"

  # Post alert to agent feed (user sees in UI)
  node scripts/post-alert.js \
    --severity "high" \
    --title "Code Standards Violation: Features Disabled" \
    --message "Automated check found disabled features in .env. Violates 'never break one thing to build another' standard." \
    --category "code-standards-violation"
fi

# Check 2: Verify all building agents have code-standards skill
node scripts/audit-agent-skills.js

# Check 3: Run regression tests
npm run test:regression || {
  echo "⚠️  ALERT: Regression tests failing"

  # Post alert to agent feed
  node scripts/post-alert.js \
    --severity "critical" \
    --title "Code Standards Violation: Regression Tests Failing" \
    --message "Automated check found failing regression tests." \
    --category "code-standards-violation"
}

# Check 4: Analyze violation logs
node scripts/analyze-violations.js
```

**Automated Weekly Standards Audit** (Sunday 3 AM):
```javascript
// /scripts/audit-agent-skills.js
// Automated agent skill compliance check

const fs = require('fs');
const path = require('path');

async function auditAgentSkills() {
  const agentsDir = '/workspaces/agent-feed/prod/.claude/agents';
  const buildingAgents = [
    'agent-architect-agent',
    'agent-maintenance-agent',
    'skills-architect-agent',
    'skills-maintenance-agent',
    'coder',
    'sparc-coder',
    'backend-dev',
    'mobile-dev',
    'tdd-london-swarm'
  ];

  const violations = [];

  for (const agentName of buildingAgents) {
    const agentPath = path.join(agentsDir, `${agentName}.md`);

    if (!fs.existsSync(agentPath)) {
      violations.push({
        agent: agentName,
        issue: 'Agent file not found',
        severity: 'high'
      });
      continue;
    }

    const content = fs.readFileSync(agentPath, 'utf-8');
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

    if (!frontmatterMatch) {
      violations.push({
        agent: agentName,
        issue: 'No frontmatter found',
        severity: 'high'
      });
      continue;
    }

    const hasCodeStandards = frontmatterMatch[1].includes('code-standards')
      && frontmatterMatch[1].includes('required: true');

    if (!hasCodeStandards) {
      violations.push({
        agent: agentName,
        issue: 'Missing required code-standards skill',
        severity: 'critical'
      });
    }
  }

  // Generate report
  const report = {
    timestamp: new Date().toISOString(),
    totalAgents: buildingAgents.length,
    compliant: buildingAgents.length - violations.length,
    violations: violations,
    complianceRate: ((buildingAgents.length - violations.length) / buildingAgents.length * 100).toFixed(2) + '%'
  };

  // Save report
  fs.writeFileSync(
    '/workspaces/agent-feed/logs/standards-audit.json',
    JSON.stringify(report, null, 2)
  );

  // Auto-fix if possible
  if (violations.length > 0) {
    console.log(`⚠️  Found ${violations.length} violations. Attempting auto-fix...`);

    for (const violation of violations) {
      if (violation.issue === 'Missing required code-standards skill') {
        // Auto-spawn agent-maintenance-agent to fix
        await autoFixAgentSkill(violation.agent);
      }
    }
  }

  return report;
}

async function autoFixAgentSkill(agentName) {
  // Spawn agent-maintenance-agent to add code-standards skill
  console.log(`🤖 Auto-fixing ${agentName}...`);

  // Use AVI to route to agent-maintenance-agent
  const { spawn } = require('child_process');
  const fix = spawn('npx', [
    'claude-flow@alpha',
    'agent',
    'spawn',
    'agent-maintenance-agent',
    '--task',
    `Add code-standards skill with required: true to ${agentName}`
  ]);

  return new Promise((resolve) => {
    fix.on('close', (code) => {
      console.log(code === 0 ? '✅ Auto-fix successful' : '❌ Auto-fix failed');
      resolve(code === 0);
    });
  });
}

module.exports = { auditAgentSkills };
```

**Automated Violation Pattern Learning**:
```javascript
// /scripts/analyze-violations.js
// Learns from violations and auto-updates standards

const fs = require('fs');
const path = require('path');

async function analyzeViolations() {
  const logsDir = '/workspaces/agent-feed/logs';
  const violationLogs = fs.readdirSync(logsDir)
    .filter(f => f.includes('violation'))
    .map(f => JSON.parse(fs.readFileSync(path.join(logsDir, f), 'utf-8')));

  // Pattern detection
  const patterns = {};
  for (const log of violationLogs) {
    const key = log.violationType || 'unknown';
    patterns[key] = (patterns[key] || 0) + 1;
  }

  // If new pattern emerges (>5 occurrences), auto-update skill
  for (const [pattern, count] of Object.entries(patterns)) {
    if (count >= 5 && !isPatternDocumented(pattern)) {
      console.log(`🧠 New violation pattern detected: ${pattern} (${count} occurrences)`);

      // Auto-spawn skills-maintenance-agent to update code-standards skill
      await updateCodeStandardsSkill(pattern, count);
    }
  }

  // Generate insights report
  const insights = {
    timestamp: new Date().toISOString(),
    totalViolations: violationLogs.length,
    patterns: patterns,
    recommendations: generateRecommendations(patterns)
  };

  fs.writeFileSync(
    '/workspaces/agent-feed/logs/violation-insights.json',
    JSON.stringify(insights, null, 2)
  );

  return insights;
}

function isPatternDocumented(pattern) {
  const skillPath = '/workspaces/agent-feed/prod/skills/.system/code-standards/violation-examples.md';
  const content = fs.readFileSync(skillPath, 'utf-8');
  return content.includes(pattern);
}

async function updateCodeStandardsSkill(pattern, count) {
  console.log(`🤖 Auto-updating code-standards skill with new pattern...`);

  // Spawn skills-maintenance-agent
  const { spawn } = require('child_process');
  const update = spawn('npx', [
    'claude-flow@alpha',
    'agent',
    'spawn',
    'skills-maintenance-agent',
    '--task',
    `Add new violation pattern "${pattern}" to code-standards skill (detected ${count} times)`
  ]);

  return new Promise((resolve) => {
    update.on('close', (code) => {
      console.log(code === 0 ? '✅ Skill auto-updated' : '❌ Update failed');
      resolve(code === 0);
    });
  });
}

function generateRecommendations(patterns) {
  // AI-driven recommendations based on patterns
  const recommendations = [];

  if (patterns['disabled-feature'] > 3) {
    recommendations.push({
      priority: 'high',
      action: 'Strengthen pre-commit hook to catch feature disabling earlier',
      autoImplement: true
    });
  }

  if (patterns['regression-failure'] > 2) {
    recommendations.push({
      priority: 'medium',
      action: 'Expand regression test coverage',
      autoImplement: false,
      requiresUserApproval: true
    });
  }

  return recommendations;
}

module.exports = { analyzeViolations };
```

**Automated Self-Healing**:
```javascript
// /scripts/self-healing-standards.js
// AVI auto-fixes standards violations

async function selfHealingCheck() {
  console.log('🔄 AVI Self-Healing Standards Check...');

  // Check 1: Auto-fix disabled features
  const envPath = '/workspaces/agent-feed/.env';
  const envContent = fs.readFileSync(envPath, 'utf-8');

  if (envContent.includes('ENABLED=false')) {
    console.log('⚠️  Disabled features detected. Checking if fix available...');

    // Check if there's a documented fix plan
    const fixPlanPath = '/workspaces/agent-feed/docs/FIX_PLANS/';
    const fixPlans = fs.readdirSync(fixPlanPath).filter(f => f.endsWith('.md'));

    if (fixPlans.length > 0) {
      console.log(`📋 Found ${fixPlans.length} fix plans. Attempting auto-execution...`);

      // Auto-execute fix plans (if marked as auto-executable)
      for (const plan of fixPlans) {
        const planContent = fs.readFileSync(path.join(fixPlanPath, plan), 'utf-8');
        if (planContent.includes('auto-executable: true')) {
          await executeFixPlan(planContent);
        }
      }
    } else {
      // No fix plan - create GitHub issue for user review
      console.log('📝 No fix plan found. Creating issue for user...');
      await createFixPlanIssue();
    }
  }

  // Check 2: Auto-fix missing agent skills
  const auditResult = await auditAgentSkills();
  // Auto-fix already handled in auditAgentSkills()

  // Check 3: Auto-update enforcement mechanisms if new violations
  const insights = await analyzeViolations();
  // Auto-update already handled in analyzeViolations()

  console.log('✅ Self-healing check complete');
}

async function createFixPlanIssue() {
  // Post alert to agent feed instead of GitHub issue
  const alertService = require('./post-alert');
  await alertService.postAlert({
    severity: 'critical',
    title: '🚨 Automated Alert: Feature Disabled Without Fix Plan',
    message: 'AVI detected disabled features in .env but no fix plan exists. This violates code standards. Please create a fix plan or re-enable features.',
    category: 'code-standards-violation',
    actionRequired: true,
    suggestedActions: [
      'Review disabled features in .env',
      'Create fix plan in /docs/FIX_PLANS/',
      'Re-enable features if safe to do so'
    ]
  });
}

// Run on cron schedule
if (require.main === module) {
  selfHealingCheck().catch(console.error);
}

module.exports = { selfHealingCheck };
```

**Automated Reporting to User**:
```javascript
// /scripts/weekly-standards-report.js
// Generates automated weekly report for user

async function generateWeeklyReport() {
  const report = {
    week: getWeekNumber(),
    timestamp: new Date().toISOString(),
    summary: {
      complianceRate: '100%', // From audit
      violationsDetected: 0,
      violationsAutoFixed: 0,
      violationsRequiringUserAction: 0
    },
    details: {
      agentCompliance: await getAgentComplianceStatus(),
      codeCompliance: await getCodeComplianceStatus(),
      violationPatterns: await getViolationPatterns(),
      autoFixesApplied: await getAutoFixesList()
    },
    recommendations: [
      // AI-generated based on patterns
    ]
  };

  // Save report
  fs.writeFileSync(
    `/workspaces/agent-feed/logs/weekly-reports/week-${report.week}.json`,
    JSON.stringify(report, null, 2)
  );

  // Post to agent feed (user visibility)
  await postToAgentFeed({
    agentName: 'Λvi',
    title: `📊 Weekly Code Standards Report - Week ${report.week}`,
    content: formatReportForFeed(report),
    metadata: {
      complianceRate: report.summary.complianceRate,
      autoFixesApplied: report.summary.violationsAutoFixed
    }
  });

  console.log('✅ Weekly report generated and posted to feed');
}

// Run every Sunday at 6 PM
module.exports = { generateWeeklyReport };
```

**Cron Job Setup**:
```bash
# Add to /etc/crontab or use node-cron

# Daily standards check at 2 AM
0 2 * * * cd /workspaces/agent-feed && ./scripts/automated-standards-check.sh

# Weekly audit at 3 AM Sunday
0 3 * * 0 cd /workspaces/agent-feed && node scripts/audit-agent-skills.js

# Self-healing check every 6 hours
0 */6 * * * cd /workspaces/agent-feed && node scripts/self-healing-standards.js

# Weekly report at 6 PM Sunday
0 18 * * 0 cd /workspaces/agent-feed && node scripts/weekly-standards-report.js

# Violation analysis daily at 11 PM
0 23 * * * cd /workspaces/agent-feed && node scripts/analyze-violations.js
```

---

**Internal Alert Service** (No GitHub Required):
```javascript
// /scripts/post-alert.js
// Posts alerts to agent feed instead of GitHub issues

const axios = require('axios');

async function postAlert(options) {
  const {
    severity,      // 'low', 'medium', 'high', 'critical'
    title,
    message,
    category,
    actionRequired = false,
    suggestedActions = []
  } = options;

  // Determine alert styling based on severity
  const severityConfig = {
    low: { emoji: 'ℹ️', color: 'blue' },
    medium: { emoji: '⚠️', color: 'yellow' },
    high: { emoji: '🔴', color: 'orange' },
    critical: { emoji: '🚨', color: 'red' }
  };

  const config = severityConfig[severity] || severityConfig.medium;

  // Format alert content for agent feed
  const alertContent = {
    agentName: 'Λvi',
    title: `${config.emoji} ${title}`,
    hook: `Automated code standards check detected an issue`,
    contentBody: `
## ${title}

**Severity**: ${severity.toUpperCase()}
**Category**: ${category}

${message}

${actionRequired ? '### Action Required\n' + suggestedActions.map(a => `- ${a}`).join('\n') : ''}

---

*This is an automated alert from AVI's code standards enforcement system.*
*Alert generated at: ${new Date().toISOString()}*
    `,
    metadata: {
      alertType: 'code-standards-violation',
      severity: severity,
      category: category,
      automated: true,
      timestamp: new Date().toISOString()
    }
  };

  try {
    // Post to agent feed API
    const response = await axios.post(
      'http://localhost:3001/api/v1/agent-posts',
      alertContent
    );

    console.log(`✅ Alert posted to agent feed: ${title}`);

    // Also log to violation log for pattern analysis
    const fs = require('fs');
    const logPath = '/workspaces/agent-feed/logs/violations.jsonl';
    const logEntry = JSON.stringify({
      timestamp: new Date().toISOString(),
      severity,
      category,
      title,
      message,
      actionRequired,
      ...options
    }) + '\n';

    fs.appendFileSync(logPath, logEntry);

    return response.data;
  } catch (error) {
    console.error('❌ Failed to post alert:', error.message);

    // Fallback: Write to local alert file
    const fs = require('fs');
    const alertPath = '/workspaces/agent-feed/logs/pending-alerts.json';
    let alerts = [];

    if (fs.existsSync(alertPath)) {
      alerts = JSON.parse(fs.readFileSync(alertPath, 'utf-8'));
    }

    alerts.push({
      ...alertContent,
      failedToPost: true,
      error: error.message
    });

    fs.writeFileSync(alertPath, JSON.stringify(alerts, null, 2));
    console.log('📝 Alert saved to pending-alerts.json for manual review');
  }
}

// CLI support
if (require.main === module) {
  const args = require('minimist')(process.argv.slice(2));
  postAlert(args).catch(console.error);
}

module.exports = { postAlert };
```

---

**Key Changes from Manual to Automated**:

1. ❌ ~~Monthly reviews~~ → ✅ **Daily automated checks**
2. ❌ ~~Quarterly audits~~ → ✅ **Weekly automated audits**
3. ❌ ~~Standards evolution~~ → ✅ **Automated pattern learning and skill updates**
4. ✅ **NEW: Self-healing** - Auto-fixes violations when possible
5. ✅ **NEW: Automated reporting** - Posts weekly reports to agent feed
6. ✅ **NEW: AI-driven recommendations** - Learns from patterns, suggests improvements
7. ✅ **NO GITHUB REQUIRED** - Uses internal agent feed for alerts

**Alert Delivery Methods**:
- **Primary**: Post to agent feed (user sees in UI)
- **Fallback**: Save to `/logs/pending-alerts.json` if API unavailable
- **Logging**: All violations logged to `/logs/violations.jsonl` for pattern analysis

**Human Involvement**: Only when auto-fix impossible or user approval required for major changes

**GitHub Integration**: OPTIONAL - If user connects GitHub, can also create issues, but NOT required for enforcement

### Example: AVI Orchestrator Case

**WRONG** ❌:
- Disable AVI Orchestrator to test tier filtering
- Deploy tier filtering while orchestrator broken
- User loses orchestrator functionality

**CORRECT** ✅:
- Investigate orchestrator crash root cause
- Fix orchestrator SQLite compatibility
- Test tier filtering works
- Test orchestrator works
- Deploy both working together
```

---

## Part 4: Implementation Order (Recommended Sequence)

### Phase 1: Investigation (30-45 minutes)
1. Investigate AVI Orchestrator architecture
2. Determine database mode requirements
3. Identify missing repository functions
4. Document findings

### Phase 2: Fix Orchestrator (1-3 hours depending on option chosen)
1. Implement chosen fix option
2. Test orchestrator runs without crashes
3. Verify agent automation works
4. **DO NOT proceed until orchestrator works**

### Phase 3: Fix Tier Filtering UI (5-10 minutes)
1. Update App.tsx to use AgentManager component
2. Test tier toggle, icons, badges appear
3. Test filtering works (T1, T2, All)
4. Test localStorage persistence

### Phase 4: Integration Testing (30 minutes)
1. Test both orchestrator AND tier filtering work together
2. Test no regressions in other features
3. Test all API endpoints respond correctly
4. Verify no console errors

### Phase 5: Documentation (15 minutes)
1. Create CODE_STANDARDS.md document
2. Update project README with link to standards
3. Document orchestrator fix for future reference

---

## Part 5: Testing Checklist

### Tier Filtering Tests
- [ ] Tier toggle buttons visible (T1, T2, All)
- [ ] Clicking T1 shows only tier-1 agents (9 expected)
- [ ] Clicking T2 shows only tier-2 agents (10 expected)
- [ ] Clicking All shows all agents (19 expected)
- [ ] Agent icons display correctly (SVG → Emoji → Initials)
- [ ] Tier badges show (T1 blue, T2 gray)
- [ ] Protection badges show for protected agents
- [ ] Filter selection persists on page reload (localStorage)
- [ ] API endpoint `/api/v1/claude-live/prod/agents?tier=X` works

### AVI Orchestrator Tests
- [ ] Backend starts without crashes
- [ ] Orchestrator initialization completes
- [ ] No `aviStateRepo.updateState is not a function` error
- [ ] No `workQueueRepo.getTicketsByUser is not a function` error
- [ ] Agent automation functions work
- [ ] Orchestrator coordination active

### Regression Tests
- [ ] Feed posts load correctly
- [ ] Agent list loads correctly
- [ ] Comments system works
- [ ] No new console errors
- [ ] No new network errors
- [ ] Frontend connects to backend (port 3001)

### Integration Tests (Both Features Together)
- [ ] Can filter agents by tier while orchestrator runs
- [ ] Orchestrator doesn't interfere with tier filtering
- [ ] No memory leaks
- [ ] No performance degradation
- [ ] All API endpoints respond within acceptable time

---

## Part 6: Rollback Plans

### If Tier Filtering Breaks
**Quick Rollback** (1 minute):
```bash
# Revert App.tsx to use IsolatedRealAgentManager
git checkout HEAD -- frontend/src/App.tsx
npm run dev
```

**Diagnosis**:
- Check browser console for errors
- Check network tab for failed API calls
- Verify component imports correct

### If Orchestrator Fix Breaks
**Emergency Rollback** (1 minute):
```bash
# Re-disable orchestrator temporarily
echo "AVI_ORCHESTRATOR_ENABLED=false" >> .env
npm run server:dev
```

**Diagnosis Required**:
- Review orchestrator logs in `/logs/`
- Check database connection
- Verify repository implementations
- Document issue for deeper investigation

**CRITICAL**: If re-disabled, mark as high-priority fix - cannot stay disabled

### If Both Break
**Full Rollback**:
1. Revert App.tsx changes
2. Re-disable orchestrator
3. Document state clearly
4. Investigate issues separately
5. Fix one at a time with proper testing
6. Re-deploy when both verified working

---

## Part 7: Success Criteria

### Tier Filtering Success
✅ User can see tier toggle buttons (T1, T2, All)
✅ User can filter agents by tier
✅ Icons display for all agents
✅ Tier badges display correctly
✅ Protection badges show for protected agents
✅ Filter persists across page reloads

### AVI Orchestrator Success
✅ Backend starts without crashes
✅ Orchestrator initialization completes
✅ Agent automation functions work
✅ No repository function errors
✅ User has full orchestrator functionality

### Code Standards Success
✅ CODE_STANDARDS.md document created
✅ Standard documented and clear
✅ Enforcement mechanisms defined
✅ Example cases provided

### Integration Success
✅ Both features work simultaneously
✅ No regressions in existing features
✅ All tests pass
✅ No errors in logs or console
✅ User has complete, unbroken functionality

---

## Part 8: Time Estimates

| Phase | Optimistic | Realistic | Pessimistic |
|-------|-----------|-----------|-------------|
| Investigation | 15 min | 30 min | 45 min |
| Fix Orchestrator | 30 min | 1.5 hours | 3 hours |
| Fix Tier Filtering | 5 min | 10 min | 20 min |
| Integration Testing | 15 min | 30 min | 1 hour |
| Documentation | 10 min | 15 min | 30 min |
| **TOTAL** | **1h 15m** | **2h 25m** | **5h 15m** |

**Most Likely Total**: 2-3 hours

---

## Part 9: Dependencies and Prerequisites

### Required Before Starting
- [ ] User approval of this plan
- [ ] Backend currently running (for testing)
- [ ] Frontend currently running (for testing)
- [ ] Access to database (SQLite or PostgreSQL)
- [ ] Git repository clean (can rollback cleanly)

### Optional but Helpful
- [ ] PostgreSQL credentials (if Option B chosen)
- [ ] Orchestrator architecture documentation
- [ ] Original orchestrator implementation notes

---

## Part 10: Communication Plan

### Before Implementation
- Present this plan to user for approval
- Clarify any questions about approach
- Confirm database mode preference (SQLite vs PostgreSQL)

### During Implementation
- Report completion of each phase
- Report any blockers immediately
- Document any deviations from plan

### After Implementation
- Demonstrate tier filtering working
- Demonstrate orchestrator working
- Demonstrate both working together
- Provide CODE_STANDARDS.md document

---

## Conclusion

This plan addresses all three requirements:

1. **Fixes tier filtering UI** - Component swap in App.tsx (low risk, fast)
2. **Restores AVI Orchestrator** - Investigation → Fix → Re-enable (comprehensive)
3. **Establishes code standard** - Formal documentation prevents future breaks

**Core Principle Honored**: "We never break one thing to test or build another. If we do, we fix both before deployment."

**User Confidence**: This plan ensures both features will work together before user sees the result.

**Next Step**: Await user approval to proceed with implementation.
