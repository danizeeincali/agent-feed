# Claude CLI Terminal Analysis Report

## Issue Summary

**Problem**: Claude CLI commands hang when executed in terminal sessions spawned by backend-terminal-server.js, appearing as "Claude Code not found" to users.

**Root Cause**: Interactive Claude CLI commands (e.g., `claude chat`) hang indefinitely in the spawned terminal environment, not PATH resolution issues.

## Technical Analysis

### Environment Investigation

✅ **PATH Resolution**: WORKING
- Claude CLI located at: `/home/codespace/nvm/current/bin/claude`
- PATH correctly includes `/home/codespace/nvm/current/bin`
- Environment inheritance from parent process works correctly

✅ **Basic Claude CLI Commands**: WORKING
- `which claude` → `/home/codespace/nvm/current/bin/claude`
- `claude --version` → `1.0.89 (Claude Code)`
- `claude --help` → Shows help text correctly

❌ **Interactive Claude CLI Commands**: HANGING
- `claude chat "prompt"` → Hangs indefinitely
- `echo "text" | claude chat "prompt"` → Hangs indefinitely
- No error messages, just silent timeout

### Spawned Process Configuration

Current backend-terminal-server.js spawn configuration:
```javascript
spawn('/bin/bash', ['-i'], {
  cwd: this.cwd,
  env: {
    ...process.env,
    TERM: 'xterm-256color',
    COLORTERM: 'truecolor'
  },
  stdio: ['pipe', 'pipe', 'pipe']
});
```

### Root Cause Analysis

1. **Interactive Mode Conflict**: Claude CLI expects a fully interactive terminal environment
2. **stdio Configuration**: Using 'pipe' for all stdio may interfere with Claude's interactive features
3. **Terminal Emulation**: Claude CLI may require proper PTY (pseudo-terminal) for interactive commands
4. **Authentication/API State**: Claude CLI may be waiting for authentication that can't complete in piped environment

## Specific Issues Identified

### 1. Missing PTY Support
- Current implementation uses `spawn()` with piped stdio
- Interactive CLI tools often require PTY for proper operation
- Should consider using `node-pty` library for true terminal emulation

### 2. Environment Variables
- May need additional environment variables for Claude CLI
- Possible missing: `ANTHROPIC_API_KEY`, `CLAUDE_CONFIG_PATH`

### 3. Terminal Capabilities
- Interactive commands may check terminal capabilities
- TERM=xterm-256color may not be sufficient

## Recommended Solutions

### Option 1: Use Non-Interactive Claude CLI Mode
```javascript
// Instead of: claude chat "prompt"
// Use: claude --print chat "prompt"
proc.stdin.write('claude --print chat "hello world"\n');
```

### Option 2: Implement PTY Support
```javascript
const pty = require('node-pty');
const ptyProcess = pty.spawn('/bin/bash', ['-i'], {
  name: 'xterm-color',
  cols: 80,
  rows: 24,
  cwd: process.env.HOME,
  env: process.env
});
```

### Option 3: Pre-configure Claude CLI
- Set up Claude CLI in non-interactive mode
- Configure API keys in environment
- Use batch processing mode

## Code Changes Required

### 1. Update backend-terminal-server.js
```javascript
// Add PTY dependency
const pty = require('node-pty');

// Replace spawn with pty.spawn in spawnShell()
this.process = pty.spawn(shell, args, {
  name: 'xterm-color',
  cols: 80,
  rows: 24,
  cwd: this.cwd,
  env: {
    ...process.env,
    TERM: 'xterm-256color',
    COLORTERM: 'truecolor'
  }
});
```

### 2. Add Claude CLI Detection
```javascript
// Add method to check Claude CLI compatibility
checkClaudeCompatibility() {
  try {
    const version = require('child_process').execSync('claude --version', { encoding: 'utf8' });
    console.log('Claude CLI available:', version.trim());
    return true;
  } catch (error) {
    console.warn('Claude CLI not available:', error.message);
    return false;
  }
}
```

### 3. Package Dependencies
```json
{
  "dependencies": {
    "node-pty": "^0.10.1"
  }
}
```

## Testing Strategy

1. **Direct Command Test**: Test Claude CLI commands in spawned processes
2. **PTY Implementation**: Test with node-pty library
3. **Non-interactive Mode**: Test --print flag usage
4. **Integration Test**: Full terminal session with Claude commands

## Priority Actions

1. ✅ **Immediate**: Identify root cause (completed)
2. 🔄 **Next**: Test non-interactive Claude CLI mode
3. 📋 **Then**: Implement PTY support for full compatibility
4. ✅ **Final**: Validate all Claude CLI commands work correctly

## Impact Assessment

- **User Experience**: Commands appear to "not be found" when they actually hang
- **Functionality**: Interactive AI assistance unavailable in terminal
- **Workaround**: Non-interactive mode should provide immediate relief
- **Long-term**: PTY implementation needed for full terminal experience