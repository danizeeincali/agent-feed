/**
 * Test Helper: Claude Spawning Function
 * 
 * Isolated version of createRealClaudeInstance for testing
 * This allows us to test the function logic without importing the entire backend
 */

const { spawn } = require('child_process');

// Claude Command Configurations (matching simple-backend.js)
const CLAUDE_COMMANDS = {
  'prod': ['claude'],
  'skip-permissions': ['claude', '--dangerously-skip-permissions'], 
  'skip-permissions-c': ['claude', '--dangerously-skip-permissions', '-c'],
  'skip-permissions-resume': ['claude', '--dangerously-skip-permissions', '--resume']
};

// Directory mapping for different instance types
const WORKING_DIRECTORIES = {
  'prod': '/workspaces/agent-feed/prod',
  'skip-permissions': '/workspaces/agent-feed',
  'skip-permissions-c': '/workspaces/agent-feed',
  'skip-permissions-resume': '/workspaces/agent-feed'
};

/**
 * Creates a real Claude instance with directory-specific spawning
 * This is the CORRECTED version that should be implemented
 */
function createRealClaudeInstance(instanceType, instanceId) {
  // BUG FIX: Use instance-type specific working directory
  const workingDir = WORKING_DIRECTORIES[instanceType] || '/workspaces/agent-feed';
  const [command, ...args] = CLAUDE_COMMANDS[instanceType] || CLAUDE_COMMANDS['prod'];
  
  console.log(`🚀 Spawning real Claude process: ${command} ${args.join(' ')} in ${workingDir}`);
  
  try {
    const claudeProcess = spawn(command, args, {
      cwd: workingDir, // FIXED: Now uses instance-type specific directory
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
      shell: false
    });
    
    const processInfo = {
      process: claudeProcess,
      pid: claudeProcess.pid,
      status: 'starting',
      startTime: new Date(),
      command: `${command} ${args.join(' ')}`,
      workingDirectory: workingDir, // FIXED: Records actual working directory
      instanceType
    };
    
    return processInfo;
    
  } catch (error) {
    console.error(`❌ Failed to spawn Claude process:`, error);
    throw error;
  }
}

/**
 * Original buggy version for comparison tests
 */
function createRealClaudeInstanceOriginal(instanceType, instanceId) {
  // BUG: Always uses the same directory regardless of instance type
  const workingDir = '/workspaces/agent-feed';
  const [command, ...args] = CLAUDE_COMMANDS[instanceType] || CLAUDE_COMMANDS['prod'];
  
  console.log(`🚀 Spawning real Claude process: ${command} ${args.join(' ')} in ${workingDir}`);
  
  try {
    const claudeProcess = spawn(command, args, {
      cwd: workingDir, // BUG: Hardcoded directory
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
      shell: false
    });
    
    const processInfo = {
      process: claudeProcess,
      pid: claudeProcess.pid,
      status: 'starting',
      startTime: new Date(),
      command: `${command} ${args.join(' ')}`,
      workingDirectory: workingDir,
      instanceType
    };
    
    return processInfo;
    
  } catch (error) {
    console.error(`❌ Failed to spawn Claude process:`, error);
    throw error;
  }
}

module.exports = {
  createRealClaudeInstance,
  createRealClaudeInstanceOriginal,
  CLAUDE_COMMANDS,
  WORKING_DIRECTORIES
};