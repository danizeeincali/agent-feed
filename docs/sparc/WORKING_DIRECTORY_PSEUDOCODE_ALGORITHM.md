# SPARC PHASE 2: PSEUDOCODE - Working Directory Resolution Algorithm

## Algorithm Design Overview
Design an efficient, secure directory resolution system that maps button types to appropriate working directories.

## Core Algorithm Pseudocode

```
FUNCTION resolveWorkingDirectory(instanceType, instanceName):
    // Step 1: Initialize base directory and defaults
    SET baseDir = '/workspaces/agent-feed'
    SET defaultDir = baseDir
    SET targetDir = baseDir
    
    // Step 2: Parse instance information to extract directory hint
    SET directoryHint = extractDirectoryHint(instanceType, instanceName)
    
    // Step 3: Apply directory mapping rules
    IF directoryHint == 'prod':
        SET targetDir = baseDir + '/prod'
    ELSE IF directoryHint == 'frontend':  
        SET targetDir = baseDir + '/frontend'
    ELSE IF directoryHint == 'tests':
        SET targetDir = baseDir + '/tests'
    ELSE IF directoryHint == 'src':
        SET targetDir = baseDir + '/src'
    ELSE:
        SET targetDir = defaultDir
    
    // Step 4: Validate directory exists and is accessible
    IF validateDirectory(targetDir):
        RETURN targetDir
    ELSE:
        LOG "Directory validation failed for: " + targetDir + ", falling back to default"
        RETURN defaultDir
END FUNCTION

FUNCTION extractDirectoryHint(instanceType, instanceName):
    // Extract directory information from various sources
    
    // Method 1: From instance name (e.g., "prod/claude")
    IF instanceName CONTAINS '/':
        SET parts = split(instanceName, '/')
        RETURN parts[0]
    
    // Method 2: From instance type
    IF instanceType IN ['prod', 'production']:
        RETURN 'prod'
    ELSE IF instanceType IN ['frontend', 'fe', 'ui']:
        RETURN 'frontend'  
    ELSE IF instanceType IN ['test', 'tests', 'testing']:
        RETURN 'tests'
    ELSE IF instanceType IN ['src', 'source']:
        RETURN 'src'
    
    // Method 3: Analyze command string for directory hints
    // (This would be implemented in the actual function)
    
    RETURN 'default'
END FUNCTION

FUNCTION validateDirectory(dirPath):
    // Security: Ensure path is within allowed base directory
    IF NOT isWithinBaseDirectory(dirPath, '/workspaces/agent-feed'):
        LOG "Security violation: Directory outside base path: " + dirPath
        RETURN false
    
    // Check if directory exists
    IF NOT directoryExists(dirPath):
        LOG "Directory does not exist: " + dirPath  
        RETURN false
        
    // Check if directory is accessible
    IF NOT hasAccessPermissions(dirPath):
        LOG "Directory not accessible: " + dirPath
        RETURN false
        
    RETURN true
END FUNCTION

FUNCTION isWithinBaseDirectory(targetPath, basePath):
    // Resolve both paths to absolute form
    SET resolvedTarget = resolvePath(targetPath)
    SET resolvedBase = resolvePath(basePath)
    
    // Ensure target starts with base path
    RETURN resolvedTarget.startsWith(resolvedBase)
END FUNCTION
```

## Enhanced Process Creation Algorithm

```
FUNCTION createRealClaudeInstance(instanceType, instanceId):
    // Step 1: Resolve working directory using new algorithm
    SET workingDir = resolveWorkingDirectory(instanceType, extractInstanceName(instanceType))
    
    // Step 2: Get command configuration  
    SET [command, ...args] = getClaudeCommand(instanceType)
    
    // Step 3: Log the resolved configuration
    LOG "🚀 Spawning Claude process:"
    LOG "   Command: " + command + " " + args.join(' ')
    LOG "   Working Directory: " + workingDir  
    LOG "   Instance Type: " + instanceType
    LOG "   Instance ID: " + instanceId
    
    // Step 4: Create process with resolved directory
    TRY:
        SET claudeProcess = spawn(command, args, {
            cwd: workingDir,           // Use resolved directory
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {...process.env},
            shell: false
        })
        
        // Step 5: Create process info with resolved directory
        SET processInfo = {
            process: claudeProcess,
            pid: claudeProcess.pid,
            status: 'starting',
            startTime: new Date(),
            command: command + " " + args.join(' '),
            workingDirectory: workingDir,    // Store resolved directory
            instanceType: instanceType
        }
        
        RETURN processInfo
        
    CATCH error:
        LOG "❌ Failed to spawn Claude process: " + error.message
        broadcastInstanceStatus(instanceId, 'error', {error: error.message})
        THROW error
END FUNCTION
```

## Directory Mapping Table Algorithm

```
CONSTANT DIRECTORY_MAPPINGS = {
    'prod': '/prod',
    'production': '/prod', 
    'frontend': '/frontend',
    'fe': '/frontend',
    'ui': '/frontend',
    'test': '/tests',
    'tests': '/tests',
    'testing': '/tests',
    'src': '/src',
    'source': '/src',
    'default': ''
}

FUNCTION mapDirectoryFromHint(hint):
    SET normalizedHint = hint.toLowerCase().trim()
    
    IF DIRECTORY_MAPPINGS.hasKey(normalizedHint):
        RETURN DIRECTORY_MAPPINGS[normalizedHint]
    ELSE:
        RETURN DIRECTORY_MAPPINGS['default']
END FUNCTION
```

## Error Handling Algorithm

```
FUNCTION handleDirectoryResolutionError(error, attemptedDir, fallbackDir):
    // Log the error with context
    LOG "📁 Directory Resolution Error:"
    LOG "   Attempted: " + attemptedDir
    LOG "   Error: " + error.message  
    LOG "   Fallback: " + fallbackDir
    
    // Return safe fallback
    RETURN fallbackDir
END FUNCTION

FUNCTION handleProcessCreationError(error, instanceId, workingDir):
    // Log comprehensive error information
    LOG "🚨 Process Creation Failed:"
    LOG "   Instance ID: " + instanceId
    LOG "   Working Directory: " + workingDir
    LOG "   Error: " + error.message
    LOG "   Error Code: " + error.code
    
    // Broadcast error status to frontend
    broadcastInstanceStatus(instanceId, 'error', {
        error: error.message,
        workingDirectory: workingDir,
        errorCode: error.code
    })
    
    // Clean up any partial state
    cleanupFailedInstance(instanceId)
    
    THROW error
END FUNCTION
```

## Performance Optimization Algorithm

```
// Cache resolved directories to avoid repeated filesystem calls
GLOBAL directoryValidationCache = new Map()

FUNCTION validateDirectoryWithCache(dirPath):
    // Check cache first
    IF directoryValidationCache.has(dirPath):
        RETURN directoryValidationCache.get(dirPath)
    
    // Perform validation
    SET isValid = validateDirectory(dirPath)
    
    // Cache result with TTL
    directoryValidationCache.set(dirPath, isValid)
    setTimeout(() => {
        directoryValidationCache.delete(dirPath)
    }, 60000) // 1 minute cache
    
    RETURN isValid
END FUNCTION
```

## Integration Points

1. **Frontend Integration**: No changes needed - existing button clicks will work
2. **Backend Integration**: Replace hardcoded `workingDir` in `createRealClaudeInstance`
3. **Logging Integration**: Enhanced logging for directory resolution process
4. **Error Handling**: Graceful degradation with fallback directory
5. **Testing Integration**: Mock filesystem calls for unit tests

## Algorithm Complexity Analysis

- **Time Complexity**: O(1) for directory resolution (constant lookups)
- **Space Complexity**: O(1) for directory validation cache  
- **Security Complexity**: O(1) path validation with base directory checking
- **Error Handling**: Fail-safe with guaranteed fallback directory

## Edge Case Handling

1. **Malformed paths**: Sanitize and validate
2. **Permission errors**: Log and fallback gracefully
3. **Non-existent directories**: Create or fallback based on configuration
4. **Symbolic links**: Resolve to actual paths
5. **Race conditions**: Use atomic operations where possible