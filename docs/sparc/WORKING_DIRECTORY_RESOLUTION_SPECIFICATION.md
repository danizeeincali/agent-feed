# SPARC PHASE 1: SPECIFICATION - Working Directory Resolution

## Problem Statement
All Claude instances spawn in `/workspaces/agent-feed` regardless of button type, when they should spawn in specific directories based on their purpose.

## Current Issue Analysis
- **File**: `/workspaces/agent-feed/simple-backend.js`
- **Function**: `createRealClaudeInstance` (line 29-111) 
- **Problem Line**: `const workingDir = '/workspaces/agent-feed';` (line 30)
- **Impact**: All button types use the same hardcoded working directory

## Requirements Specification

### Functional Requirements
1. **Dynamic Directory Resolution**: Working directory must be determined by button type/instance name
2. **Directory Validation**: Must validate directory existence before spawning Claude process
3. **Error Handling**: Graceful failure when target directory doesn't exist
4. **Backward Compatibility**: Existing functionality must remain intact

### Button Type Mapping Requirements
Based on current system analysis:
- `prod/claude` → `/workspaces/agent-feed/prod`
- `frontend/claude` → `/workspaces/agent-feed/frontend`
- `tests/claude` → `/workspaces/agent-feed/tests`
- `default/claude` → `/workspaces/agent-feed` (fallback)

### Technical Requirements
1. **Directory Resolution Algorithm**:
   - Parse instance name/type to extract directory component
   - Construct absolute path based on base directory
   - Validate directory exists and is accessible
   - Fall back to base directory if target doesn't exist

2. **Process Spawning**:
   - Use resolved directory as `cwd` in spawn options
   - Maintain existing command structure
   - Preserve environment variables and stdio configuration

3. **Error Handling**:
   - Log directory resolution attempts
   - Handle permission errors gracefully
   - Provide meaningful error messages to frontend
   - Fall back to safe default directory

### Acceptance Criteria
- [ ] Button "prod/claude" spawns Claude in `/workspaces/agent-feed/prod`
- [ ] Button "frontend/claude" spawns Claude in `/workspaces/agent-feed/frontend`  
- [ ] Invalid directories fall back to `/workspaces/agent-feed`
- [ ] Directory validation occurs before process spawning
- [ ] Process creation errors are properly handled and logged
- [ ] Frontend receives appropriate success/error responses
- [ ] Existing terminal functionality remains intact

## Non-Functional Requirements
- **Performance**: Directory resolution must not add significant latency
- **Reliability**: System must handle edge cases gracefully
- **Maintainability**: Solution must be easily extensible for new button types
- **Security**: Directory traversal attacks must be prevented

## Edge Cases to Handle
1. **Non-existent directories**: Fall back to base directory
2. **Permission denied**: Log error and use fallback
3. **Malformed instance names**: Extract valid directory or use default
4. **Symbolic links**: Resolve to actual directory path
5. **Relative paths**: Convert to absolute paths

## Dependencies
- Node.js `path` module for directory operations
- Node.js `fs` module for directory validation
- Existing process spawning infrastructure
- Frontend button configuration system