# Claude Process Working Architecture Documentation

## 🏗️ System Architecture Overview

This document captures the **WORKING STATE** of the Claude process integration system that must be preserved through regression testing.

## ✅ Current Working State (DO NOT BREAK)

### 1. **Real Claude Process Spawning**

**Critical Code Location:** `/workspaces/agent-feed/simple-backend.js`

#### Working Implementation:
```javascript
// Lines 207-235: PTY Mode Spawning (WORKING - DO NOT MODIFY)
if (usePty) {
  const finalArgs = args; // NO --print flag for interactive Claude sessions
  claudeProcess = pty.spawn(command, finalArgs, {
    cwd: workingDir,
    name: 'xterm-256color',
    cols: 120,
    rows: 30,
    env: { ...process.env, TERM: 'xterm-256color' }
  });
}

// Lines 233-240: Pipe Mode Spawning (WORKING - DO NOT MODIFY)  
if (!usePty) {
  const finalArgs = args; // NO --print flag for interactive Claude sessions
  claudeProcess = spawn(command, finalArgs, {
    cwd: workingDir,
    env: { ...process.env },
    stdio: ['pipe', 'pipe', 'pipe']
  });
}
```

### 2. **Authentication Detection (CRITICAL)**

**Location:** `checkClaudeAuthentication()` function

#### Working Implementation:
```javascript
async function checkClaudeAuthentication() {
  // Check for Claude credentials file (Claude Code environment)
  const credentialsPath = path.join(process.env.HOME, '.claude', '.credentials.json');
  
  if (fs.existsSync(credentialsPath)) {
    return { authenticated: true, source: 'credentials_file' };
  }
  
  // Check for Claude Code environment variables
  if (process.env.CLAUDECODE === '1') {
    return { authenticated: true, source: 'claude_code_env' };
  }
  
  // Fallback: test with help command
  const { execSync } = require('child_process');
  execSync('claude --help', { timeout: 3000 });
  return { authenticated: true, source: 'cli_available' };
}
```

### 3. **Working Directory Resolution**

**Location:** `SPARC_DIRECTORY_RESOLVER` object

#### Button-to-Directory Mapping:
```javascript
const SPARC_DIRECTORY_RESOLVER = {
  'prod': '/workspaces/agent-feed/prod',
  'skip-permissions': '/workspaces/agent-feed',
  'skip-permissions-c': '/workspaces/agent-feed',
  'skip-permissions-resume': '/workspaces/agent-feed'
};
```

### 4. **Frontend Button Configuration**

**Location:** `/workspaces/agent-feed/frontend/src/components/ClaudeInstanceManager.tsx`

#### Working Buttons:
1. **prod/claude** → Creates instance in `/prod` directory
2. **skip-permissions** → Creates instance in root directory
3. **skip-permissions -c** → Creates with continue flag
4. **skip-permissions --resume** → Creates with resume flag

### 5. **SSE Terminal Streaming**

**Endpoints:** 
- `/api/v1/claude/instances/{instanceId}/terminal/stream`
- `/api/claude/instances/{instanceId}/terminal/stream`
- `/api/v1/terminal/stream/{instanceId}`

**Working Implementation:**
- Real-time output streaming via Server-Sent Events
- Bidirectional I/O through terminal input endpoints
- Status updates broadcast to all connected clients

## 🚫 Critical Anti-Patterns (NEVER REINTRODUCE)

### 1. **--print Flag (BIGGEST ISSUE)**
```javascript
// ❌ NEVER DO THIS
claudeProcess = spawn('claude', ['--print'], ...);

// ✅ ALWAYS DO THIS
claudeProcess = spawn('claude', [], ...);
```

### 2. **Mock Claude Fallback**
```javascript
// ❌ NEVER DO THIS
if (!authStatus.authenticated) {
  return createMockClaudeInstance(...);
}

// ✅ ALWAYS DO THIS
// Create real Claude instance regardless
```

### 3. **Incorrect Working Directory**
```javascript
// ❌ NEVER DO THIS
const workingDir = process.cwd();

// ✅ ALWAYS DO THIS
const workingDir = SPARC_DIRECTORY_RESOLVER[instanceType] || process.cwd();
```

## 📊 Success Metrics

These metrics indicate the system is working correctly:

1. **Claude Welcome Message:** "✻ Welcome to Claude Code!" appears
2. **Working Directory Display:** "cwd: /workspaces/agent-feed/prod" shows correctly
3. **Interactive Prompt:** "> " prompt appears and accepts input
4. **No Error Messages:** No "--print requires input" errors
5. **Status Progression:** "starting" → "running" status change
6. **Process PIDs:** Real process IDs (not mock)

## 🔒 Regression Prevention Checklist

Before any code changes, verify:

- [ ] No --print flags added to spawn commands
- [ ] Authentication detection still returns true in Claude Code
- [ ] Working directory resolution matches button types
- [ ] SSE streaming endpoints unchanged
- [ ] No Mock Claude code reactivated
- [ ] All 4 frontend buttons create real processes
- [ ] Terminal shows Claude welcome message
- [ ] Interactive prompts work correctly

## 🧪 Test Coverage Requirements

### Unit Tests (95% coverage required):
- Process spawning without --print flags
- Authentication detection logic
- Working directory resolution
- SSE connection handling

### Integration Tests (100% critical paths):
- Frontend-backend API contracts
- SSE streaming functionality
- Process lifecycle management
- Error handling and recovery

### E2E Tests (All user workflows):
- All 4 button click scenarios
- Terminal interaction flows
- Error recovery scenarios
- Performance benchmarks

## 🚀 Deployment Safety

### Pre-deployment Verification:
1. Run full regression test suite: `npm run test:regression`
2. Check NLD pattern detection: `npm run test:nld`
3. Run E2E tests: `npm run test:e2e`
4. Verify performance benchmarks: `npm run test:performance`

### Rollback Procedure:
If regression detected after deployment:
1. Immediately revert to last known working commit
2. Run regression tests to confirm fix
3. Analyze failure through NLD system
4. Apply targeted fix with comprehensive testing

## 📝 Maintenance Notes

### Monthly Tasks:
- Review and update regression test coverage
- Analyze NLD pattern detection accuracy
- Performance benchmark validation
- Security audit of process spawning

### Quarterly Tasks:
- Full system architecture review
- Test suite optimization
- Documentation updates
- Training data export for ML models

## 🎯 Key Success Factors

1. **Real Claude Processes:** Never fall back to mocks
2. **Interactive Sessions:** No --print flags ever
3. **Proper Authentication:** Use Claude Code credentials
4. **Correct Directories:** Match button expectations
5. **Reliable Streaming:** SSE connections stable

---

**Last Updated:** August 27, 2025
**Version:** 1.0.0
**Status:** WORKING - Protected by comprehensive regression testing