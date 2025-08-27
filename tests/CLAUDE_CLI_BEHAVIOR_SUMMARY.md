# Claude CLI Behavior Analysis Summary

## Key Findings

Based on comprehensive testing, here are the critical findings about Claude CLI behavior:

### ✅ What Works

1. **Basic Commands**:
   - `claude --help` - Shows comprehensive help information
   - `claude --version` - Returns version 1.0.93 (Claude Code)
   - `claude config --help` - Shows configuration options

2. **Non-Interactive Mode**:
   - **KEY DISCOVERY**: Use `claude --print` for non-interactive output
   - `echo "hello" | claude --print` - Works perfectly
   - `echo "What is 2+2?" | claude --print` - Returns "4"

3. **Working Directory**:
   - Claude respects the current working directory when using `--print`
   - Successfully tested in `/workspaces/agent-feed/prod` directory

### ❌ What Doesn't Work (Without --print flag)

1. **Interactive Mode Hangs**:
   - `claude` alone waits indefinitely for interactive input
   - `echo "hello" | claude` hangs without timeout
   - Requires manual termination or timeout

2. **Piped Input Without --print**:
   - All piped input fails unless `--print` flag is used
   - Commands timeout after 3 seconds when forced

## Required Parameters for Non-Interactive Use

**CRITICAL**: For programmatic use, always use the `--print` flag:

```bash
# ✅ CORRECT - Non-interactive mode
echo "your prompt" | claude --print

# ❌ WRONG - Will hang indefinitely
echo "your prompt" | claude
```

## Available Output Formats

Claude CLI supports multiple output formats when using `--print`:

- `--output-format text` (default)
- `--output-format json` (single result)
- `--output-format stream-json` (realtime streaming)

## Environment Variables

Found relevant environment variables:
- `CLAUDE_FLOW_AUTO_PUSH=false`
- `CLAUDE_FLOW_CHECKPOINTS_ENABLED=true`
- `CLAUDE_FLOW_HOOKS_ENABLED=true`
- `CLAUDECODE=1`
- `CLAUDE_CODE_SSE_PORT=21478`
- `CLAUDE_FLOW_TELEMETRY_ENABLED=true`
- `CLAUDE_CODE_ENTRYPOINT=cli`
- `CLAUDE_FLOW_REMOTE_EXECUTION=true`

## Authentication Status

- Claude CLI appears to be already authenticated
- `claude auth status` executes but may require interactive input
- No authentication errors when using `--print` mode

## Installation Details

- **Location**: `/home/codespace/nvm/current/bin/claude`
- **Type**: Symbolic link to `../lib/node_modules/@anthropic-ai/claude-code/cli.js`
- **Version**: 1.0.93 (Claude Code)
- **Runtime**: Node.js executable

## Integration Requirements

For backend integration with Claude CLI:

### 1. Command Structure
```javascript
const command = `echo "${prompt}" | claude --print`;
```

### 2. Working Directory Support
```javascript
const options = {
  cwd: '/workspaces/agent-feed/prod'  // or any target directory
};
```

### 3. Timeout Handling
- Interactive mode hangs indefinitely
- Always use timeouts when not using `--print`
- `--print` mode returns promptly

### 4. Error Handling
- Check exit codes (0 = success)
- Handle timeout scenarios (exit code 124)
- Parse stderr for error messages

## Example Integration Code

```javascript
const { spawn } = require('child_process');

function callClaude(prompt, workingDir = process.cwd()) {
  return new Promise((resolve, reject) => {
    const child = spawn('claude', ['--print'], {
      cwd: workingDir,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let output = '';
    let error = '';
    
    child.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      error += data.toString();
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve(output.trim());
      } else {
        reject(new Error(`Claude CLI failed with code ${code}: ${error}`));
      }
    });
    
    // Send prompt and close stdin
    child.stdin.write(prompt);
    child.stdin.end();
  });
}

// Usage
callClaude("What is 2 + 2?", "/workspaces/agent-feed/prod")
  .then(response => console.log("Claude response:", response))
  .catch(error => console.error("Error:", error));
```

## Test Files Created

1. `/workspaces/agent-feed/tests/debug-claude-cli.js` - Comprehensive debugging tool
2. `/workspaces/agent-feed/tests/quick-claude-test.js` - Quick validation script  
3. `/workspaces/agent-feed/tests/claude-integration-test.sh` - Shell-based integration tests
4. `/workspaces/agent-feed/tests/claude-cli-debug-report.json` - Detailed test results

## Next Steps

1. **Update backend code** to use `claude --print` for all non-interactive calls
2. **Test working directory behavior** with real prompts
3. **Implement proper error handling** for timeout and failure scenarios
4. **Add output format options** if needed (JSON, streaming)
5. **Test with longer prompts** and complex inputs

## Key Takeaway

**The `--print` flag is ESSENTIAL for programmatic use of Claude CLI. Without it, Claude expects interactive input and will hang indefinitely when used in pipes or spawn processes.**