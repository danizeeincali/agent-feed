# SPARC PHASE 3: ARCHITECTURE - Working Directory Resolution System

## System Architecture Overview

The Working Directory Resolution System is designed as a modular, secure, and performant component that integrates seamlessly with the existing Claude instance management infrastructure.

## Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Layer                           │
├─────────────────────────────────────────────────────────────┤
│  ClaudeInstanceManager.tsx                                  │
│  ├── Button Click Handlers                                 │
│  ├── Instance Configuration Logic                          │  
│  └── API Request Formation                                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ HTTP POST /api/claude/instances
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway Layer                        │
├─────────────────────────────────────────────────────────────┤
│  simple-backend.js                                          │
│  ├── Route Handler: POST /api/claude/instances             │
│  ├── Request Validation                                     │
│  └── Instance Creation Orchestration                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Working Directory Resolution System             │
├─────────────────────────────────────────────────────────────┤
│  DirectoryResolver Module                                   │
│  ├── resolveWorkingDirectory()                             │
│  ├── extractDirectoryHint()                                │
│  ├── validateDirectory()                                   │
│  └── isWithinBaseDirectory()                               │
│                                                             │
│  DirectoryMappings Configuration                            │
│  ├── Static Mapping Table                                  │
│  ├── Dynamic Parsing Rules                                 │
│  └── Fallback Strategies                                   │
│                                                             │
│  DirectoryValidator Module                                  │
│  ├── Existence Validation                                  │
│  ├── Permission Validation                                 │
│  ├── Security Path Validation                              │
│  └── Caching Layer                                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 Process Management Layer                    │
├─────────────────────────────────────────────────────────────┤
│  createRealClaudeInstance()                                 │
│  ├── Enhanced Logging                                      │
│  ├── Process Spawning with Resolved Directory              │
│  ├── Error Handling & Recovery                             │
│  └── Status Broadcasting                                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 System Resources Layer                      │
├─────────────────────────────────────────────────────────────┤
│  File System                                               │
│  ├── /workspaces/agent-feed/ (base)                       │
│  ├── /workspaces/agent-feed/prod/                         │
│  ├── /workspaces/agent-feed/frontend/                     │
│  ├── /workspaces/agent-feed/tests/                        │
│  └── /workspaces/agent-feed/src/                          │
│                                                             │
│  Process System                                            │  
│  ├── Claude Process Instances                              │
│  ├── Process Monitoring                                    │
│  └── Resource Cleanup                                      │
└─────────────────────────────────────────────────────────────┘
```

## Module Design Specifications

### 1. DirectoryResolver Module

```typescript
interface DirectoryResolver {
  // Primary resolution function
  resolveWorkingDirectory(instanceType: string, instanceName?: string): string;
  
  // Helper functions
  extractDirectoryHint(instanceType: string, instanceName?: string): string;
  validateDirectory(dirPath: string): boolean;
  isWithinBaseDirectory(targetPath: string, basePath: string): boolean;
}

interface DirectoryResolutionResult {
  resolvedPath: string;
  isDefault: boolean;
  validationPassed: boolean;
  securityPassed: boolean;
  errorMessage?: string;
}
```

### 2. DirectoryMappings Configuration

```typescript
interface DirectoryMappingConfig {
  // Static mappings
  staticMappings: Record<string, string>;
  
  // Dynamic parsing rules
  parseRules: ParseRule[];
  
  // Fallback configuration
  fallbackStrategy: FallbackStrategy;
  
  // Security constraints
  securityConstraints: SecurityConstraints;
}

interface ParseRule {
  pattern: RegExp;
  extractorFunction: (match: RegExpMatchArray) => string;
  priority: number;
}

interface FallbackStrategy {
  defaultDirectory: string;
  fallbackChain: string[];
  createIfMissing: boolean;
}
```

### 3. DirectoryValidator Module  

```typescript
interface DirectoryValidator {
  // Validation functions
  validateExistence(dirPath: string): Promise<boolean>;
  validatePermissions(dirPath: string): Promise<boolean>;
  validateSecurity(dirPath: string, basePath: string): boolean;
  
  // Caching functions
  getCachedResult(dirPath: string): ValidationResult | null;
  setCachedResult(dirPath: string, result: ValidationResult): void;
  clearCache(): void;
}

interface ValidationResult {
  isValid: boolean;
  exists: boolean;
  accessible: boolean;
  secure: boolean;
  timestamp: Date;
  errorMessage?: string;
}
```

## Integration Architecture

### Frontend Integration Pattern

```typescript
// No changes needed - existing pattern preserved
const getInstanceConfig = (cmd: string) => {
  // Frontend determines working directory hint
  // Backend resolves to actual directory
  return {
    command: ['claude', ...flags],
    instanceType: extractTypeFromCommand(cmd)  // Add this
  };
};
```

### Backend Integration Pattern  

```typescript
// Enhanced createRealClaudeInstance function
function createRealClaudeInstance(instanceType, instanceId) {
  // 1. Resolve working directory (NEW)
  const workingDir = DirectoryResolver.resolveWorkingDirectory(instanceType);
  
  // 2. Get command (EXISTING)
  const [command, ...args] = CLAUDE_COMMANDS[instanceType] || CLAUDE_COMMANDS['prod'];
  
  // 3. Enhanced logging (ENHANCED)
  console.log(`🚀 Spawning Claude process with resolved directory:`);
  console.log(`   Directory: ${workingDir}`);
  console.log(`   Command: ${command} ${args.join(' ')}`);
  
  // 4. Process creation (ENHANCED)  
  const claudeProcess = spawn(command, args, {
    cwd: workingDir,  // Use resolved directory
    // ... rest unchanged
  });
  
  // 5. Process info (ENHANCED)
  const processInfo = {
    // ... existing fields,
    workingDirectory: workingDir,  // Store resolved directory
    // ... rest unchanged
  };
}
```

## Data Flow Architecture

```
User Button Click
       │
       ▼
Frontend extracts instanceType from button command
       │
       ▼
POST /api/claude/instances { instanceType }  
       │
       ▼
Backend receives instanceType
       │
       ▼
DirectoryResolver.resolveWorkingDirectory(instanceType)
       │
       ├── extractDirectoryHint(instanceType) 
       │   ├── Parse instanceType for directory hints
       │   ├── Apply static mapping rules
       │   └── Return directory hint
       │
       ├── validateDirectory(resolvedPath)
       │   ├── Check cache first
       │   ├── Validate existence 
       │   ├── Validate permissions
       │   ├── Validate security constraints
       │   └── Cache result
       │
       └── Return validated directory path or fallback
       │
       ▼
Process spawned with resolved directory as cwd
       │
       ▼
Process info stored with resolved directory  
       │
       ▼
Frontend receives success response
```

## Security Architecture

### Path Traversal Prevention

```typescript
class SecurityValidator {
  private readonly baseDirectory: string = '/workspaces/agent-feed';
  
  isWithinBaseDirectory(targetPath: string): boolean {
    const resolved = path.resolve(targetPath);
    const base = path.resolve(this.baseDirectory);
    
    return resolved.startsWith(base + path.sep) || resolved === base;
  }
  
  sanitizePath(inputPath: string): string {
    // Remove dangerous path components
    return inputPath
      .replace(/\.\./g, '')  // Remove parent directory references
      .replace(/\/+/g, '/')   // Normalize multiple slashes
      .replace(/^\/+/, '')    // Remove leading slashes
      .trim();
  }
}
```

### Input Validation Architecture

```typescript
class InputValidator {
  validateInstanceType(instanceType: string): ValidationResult {
    // Check format
    if (!instanceType || typeof instanceType !== 'string') {
      return { isValid: false, error: 'Instance type must be string' };
    }
    
    // Check length
    if (instanceType.length > 100) {
      return { isValid: false, error: 'Instance type too long' };
    }
    
    // Check allowed characters  
    if (!/^[a-zA-Z0-9\-_\/]+$/.test(instanceType)) {
      return { isValid: false, error: 'Instance type contains invalid characters' };
    }
    
    return { isValid: true };
  }
}
```

## Performance Architecture

### Caching Strategy

```typescript
class PerformanceCache {
  private cache: Map<string, CachedResult> = new Map();
  private readonly TTL: number = 60000; // 1 minute
  
  get(key: string): CachedResult | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }
    
    return cached;
  }
  
  set(key: string, value: any): void {
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }
}
```

### Async Directory Validation

```typescript
class AsyncValidator {
  async validateDirectoryAsync(dirPath: string): Promise<ValidationResult> {
    try {
      // Use Promise-based fs operations for better performance
      const stats = await fs.promises.stat(dirPath);
      const access = await fs.promises.access(dirPath, fs.constants.R_OK | fs.constants.W_OK);
      
      return {
        isValid: true,
        exists: stats.isDirectory(),
        accessible: true,
        secure: this.securityValidator.isWithinBaseDirectory(dirPath)
      };
    } catch (error) {
      return {
        isValid: false,
        exists: false,
        accessible: false,
        secure: false,
        errorMessage: error.message
      };
    }
  }
}
```

## Error Handling Architecture

### Graceful Degradation Pattern

```typescript
class ErrorHandler {
  handleDirectoryResolutionError(
    error: Error, 
    attemptedDir: string, 
    fallbackDir: string
  ): string {
    // Log comprehensive error information
    console.error(`📁 Directory Resolution Error:`);
    console.error(`   Attempted: ${attemptedDir}`);
    console.error(`   Error: ${error.message}`);
    console.error(`   Fallback: ${fallbackDir}`);
    
    // Emit metrics for monitoring
    this.metricsEmitter.emit('directory.resolution.error', {
      attemptedDir,
      fallbackDir,
      error: error.message
    });
    
    // Return safe fallback
    return fallbackDir;
  }
}
```

## Monitoring & Observability Architecture

### Metrics Collection

```typescript
interface DirectoryResolutionMetrics {
  resolutionAttempts: number;
  resolutionSuccesses: number;
  resolutionErrors: number;
  fallbackUsage: number;
  cacheHitRatio: number;
  averageResolutionTime: number;
}

class MetricsCollector {
  private metrics: DirectoryResolutionMetrics = {
    resolutionAttempts: 0,
    resolutionSuccesses: 0,
    resolutionErrors: 0,
    fallbackUsage: 0,
    cacheHitRatio: 0,
    averageResolutionTime: 0
  };
  
  recordResolutionAttempt(startTime: number, success: boolean, usedFallback: boolean): void {
    this.metrics.resolutionAttempts++;
    if (success) this.metrics.resolutionSuccesses++;
    else this.metrics.resolutionErrors++;
    if (usedFallback) this.metrics.fallbackUsage++;
    
    const duration = Date.now() - startTime;
    this.metrics.averageResolutionTime = 
      (this.metrics.averageResolutionTime + duration) / 2;
  }
}
```

## Deployment Architecture

### Configuration Management

```typescript
interface DeploymentConfig {
  baseDirectory: string;
  allowedDirectories: string[];
  securityMode: 'strict' | 'permissive';
  cacheSettings: {
    enabled: boolean;
    ttl: number;
    maxEntries: number;
  };
  fallbackSettings: {
    createMissingDirectories: boolean;
    fallbackChain: string[];
  };
}
```

This architecture ensures a robust, secure, and performant working directory resolution system that integrates seamlessly with the existing Claude instance management infrastructure.