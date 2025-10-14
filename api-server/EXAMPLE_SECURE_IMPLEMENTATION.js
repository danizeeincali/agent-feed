/**
 * EXAMPLE: Secure Claude Code SDK Implementation
 * This file shows how to properly secure the Claude Code SDK integration
 *
 * Copy these classes to your actual implementation:
 * - SecureToolInterceptor → src/services/SecureToolInterceptor.js
 * - BashCommandValidator → src/services/BashCommandValidator.js
 * - ResourceLimiter → src/services/ResourceLimiter.js
 * - InputSanitizer → src/services/InputSanitizer.js
 * - OutputSanitizer → src/services/OutputSanitizer.js
 * - SecureClaudeCodeSDKManager → src/services/SecureClaudeCodeSDKManager.js
 */

import { query } from '@anthropic-ai/claude-code';
import { PathValidator } from '../worker/security/PathValidator.js';
import { FileOperationValidator } from '../worker/security/FileOperationValidator.js';
import { RateLimiter } from '../worker/security/RateLimiter.js';

// ============================================================================
// 1. BASH COMMAND VALIDATOR
// ============================================================================

export class BashCommandValidator {
  constructor() {
    // Whitelist approach: Only allow specific commands
    this.allowedCommands = [
      'ls', 'cat', 'pwd', 'echo', 'node', 'npm', 'git',
      'mkdir', 'rm', 'cp', 'mv', 'grep', 'find', 'wc',
      'head', 'tail', 'sort', 'uniq', 'diff'
    ];

    // Dangerous patterns to block
    this.dangerousPatterns = [
      { pattern: /curl\s+/i, name: 'Network request (curl)' },
      { pattern: /wget\s+/i, name: 'Network request (wget)' },
      { pattern: /nc\s+-e/i, name: 'Reverse shell (netcat)' },
      { pattern: /ssh\s+/i, name: 'Remote access (ssh)' },
      { pattern: /scp\s+/i, name: 'File transfer (scp)' },
      { pattern: /sudo\s+/i, name: 'Privilege escalation (sudo)' },
      { pattern: /su\s+-/i, name: 'Switch user (su)' },
      { pattern: /\/etc\/(passwd|shadow|sudoers)/i, name: 'System file access' },
      { pattern: /rm\s+-rf\s+(\/|~)/i, name: 'Destructive delete' },
      { pattern: /dd\s+if=/i, name: 'Disk operation (dd)' },
      { pattern: />\s*\/dev\//i, name: 'Device write' },
      { pattern: /mkfs\./i, name: 'Format filesystem' },
      { pattern: /;\s*\(/i, name: 'Command chaining with subshell' },
      { pattern: /\|\s*bash/i, name: 'Piped bash execution' },
      { pattern: /eval\s+/i, name: 'Code evaluation (eval)' },
      { pattern: /exec\s+/i, name: 'Process spawning (exec)' },
      { pattern: /:\(\)\s*\{/i, name: 'Fork bomb' },
      { pattern: /chmod\s+777/i, name: 'Dangerous permissions' },
      { pattern: /chown\s+root/i, name: 'Change ownership to root' },
      { pattern: /iptables/i, name: 'Firewall manipulation' },
      { pattern: /systemctl/i, name: 'System service control' },
      { pattern: /service\s+/i, name: 'Service control' },
      { pattern: /kill\s+-9\s+1/i, name: 'Kill init process' },
      { pattern: /\/proc\//i, name: 'Process information access' },
      { pattern: /\/sys\//i, name: 'System information access' },
      { pattern: /base64\s+-d/i, name: 'Decode obfuscated command' },
      { pattern: /xxd\s+/i, name: 'Hex dump (potential obfuscation)' },
    ];

    // Blocked path patterns
    this.blockedPaths = [
      /\/etc\//i,
      /\/root\//i,
      /\/home\/[^/]+\/\.ssh\//i,
      /\/var\/log\//i,
      /\/proc\//i,
      /\/sys\//i,
      /\/dev\//i,
      /\/boot\//i,
      /\/usr\/bin\//i,
      /\/usr\/sbin\//i,
      /\/sbin\//i,
    ];
  }

  validate(command) {
    if (!command || typeof command !== 'string') {
      return {
        valid: false,
        reason: 'Command must be a non-empty string'
      };
    }

    // Extract base command (first word)
    const trimmed = command.trim();
    const baseCmd = trimmed.split(/\s+/)[0];

    // Check if command is in whitelist
    if (!this.allowedCommands.includes(baseCmd)) {
      return {
        valid: false,
        reason: `Command '${baseCmd}' is not in the allowed list. Allowed: ${this.allowedCommands.join(', ')}`
      };
    }

    // Check for dangerous patterns
    for (const { pattern, name } of this.dangerousPatterns) {
      if (pattern.test(command)) {
        return {
          valid: false,
          reason: `Dangerous pattern detected: ${name}`
        };
      }
    }

    // Check for blocked paths
    for (const pattern of this.blockedPaths) {
      if (pattern.test(command)) {
        return {
          valid: false,
          reason: `Blocked path detected in command: ${pattern}`
        };
      }
    }

    // Check for command chaining
    if (command.includes(';') || command.includes('&&') || command.includes('||')) {
      return {
        valid: false,
        reason: 'Command chaining is not allowed (;, &&, ||)'
      };
    }

    // Check for output redirection to dangerous locations
    if (/>\s*\//.test(command) && !/>\s*\/workspaces/.test(command)) {
      return {
        valid: false,
        reason: 'Output redirection outside workspace is not allowed'
      };
    }

    // Check for path traversal in arguments
    if (command.includes('../') || command.includes('..\\')) {
      return {
        valid: false,
        reason: 'Path traversal in command arguments is not allowed'
      };
    }

    return { valid: true };
  }
}

// ============================================================================
// 2. SECURE TOOL INTERCEPTOR
// ============================================================================

export class SecureToolInterceptor {
  constructor(config = {}) {
    this.allowedWorkspace = config.allowedWorkspace ||
      '/workspaces/agent-feed/prod/agent_workspace';

    this.pathValidator = new PathValidator({
      allowedWorkspace: this.allowedWorkspace
    });

    this.fileValidator = new FileOperationValidator({
      allowedWorkspace: this.allowedWorkspace,
      maxFileSize: config.maxFileSize || 10 * 1024 * 1024
    });

    this.bashValidator = new BashCommandValidator();

    // Statistics
    this.stats = {
      totalCalls: 0,
      blocked: 0,
      allowed: 0,
      byTool: {}
    };
  }

  async interceptToolCall(toolName, toolInput) {
    this.stats.totalCalls++;
    this.stats.byTool[toolName] = (this.stats.byTool[toolName] || 0) + 1;

    try {
      switch (toolName) {
        case 'Read':
          return await this.validateReadTool(toolInput);

        case 'Write':
          return await this.validateWriteTool(toolInput);

        case 'Edit':
          return await this.validateEditTool(toolInput);

        case 'Bash':
          return await this.validateBashTool(toolInput);

        case 'Grep':
        case 'Glob':
          return await this.validateSearchTool(toolName, toolInput);

        case 'WebFetch':
        case 'WebSearch':
          return await this.validateNetworkTool(toolName, toolInput);

        default:
          throw new SecurityError(`Unknown or disallowed tool: ${toolName}`);
      }
    } catch (error) {
      this.stats.blocked++;
      console.error(`🚫 Security blocked ${toolName}:`, error.message);
      throw error;
    }

    this.stats.allowed++;
  }

  async validateReadTool(toolInput) {
    const filePath = toolInput.file_path || toolInput.path;

    if (!filePath) {
      throw new SecurityError('File path is required for Read operation');
    }

    // Validate path
    const pathValidation = await this.pathValidator.validate(filePath);
    if (!pathValidation.valid) {
      throw new SecurityError(`Path validation failed: ${pathValidation.reason}`);
    }

    // Validate file operation
    const fileValidation = await this.fileValidator.validateOperation(
      pathValidation.normalizedPath,
      'read'
    );

    if (!fileValidation.valid) {
      throw new SecurityError(`File validation failed: ${fileValidation.reason}`);
    }

    // Replace with normalized path
    toolInput.file_path = fileValidation.normalizedPath;
    toolInput.path = fileValidation.normalizedPath;

    return toolInput;
  }

  async validateWriteTool(toolInput) {
    const filePath = toolInput.file_path || toolInput.path;
    const content = toolInput.content;

    if (!filePath) {
      throw new SecurityError('File path is required for Write operation');
    }

    if (content === undefined) {
      throw new SecurityError('Content is required for Write operation');
    }

    // Validate path
    const pathValidation = await this.pathValidator.validate(filePath);
    if (!pathValidation.valid) {
      throw new SecurityError(`Path validation failed: ${pathValidation.reason}`);
    }

    // Validate file operation with content
    const fileValidation = await this.fileValidator.validateOperation(
      pathValidation.normalizedPath,
      'write',
      content
    );

    if (!fileValidation.valid) {
      throw new SecurityError(`File validation failed: ${fileValidation.reason}`);
    }

    // Use sanitized content
    toolInput.content = fileValidation.sanitizedContent;
    toolInput.file_path = fileValidation.normalizedPath;
    toolInput.path = fileValidation.normalizedPath;

    return toolInput;
  }

  async validateEditTool(toolInput) {
    const filePath = toolInput.file_path || toolInput.path;

    if (!filePath) {
      throw new SecurityError('File path is required for Edit operation');
    }

    // Validate path
    const pathValidation = await this.pathValidator.validate(filePath);
    if (!pathValidation.valid) {
      throw new SecurityError(`Path validation failed: ${pathValidation.reason}`);
    }

    // Validate old_string and new_string if present
    if (toolInput.new_string) {
      const contentValidation = await this.fileValidator.validateOperation(
        pathValidation.normalizedPath,
        'write',
        toolInput.new_string
      );

      if (!contentValidation.valid) {
        throw new SecurityError(`Content validation failed: ${contentValidation.reason}`);
      }

      toolInput.new_string = contentValidation.sanitizedContent;
    }

    toolInput.file_path = pathValidation.normalizedPath;
    toolInput.path = pathValidation.normalizedPath;

    return toolInput;
  }

  async validateBashTool(toolInput) {
    const command = toolInput.command;

    if (!command) {
      throw new SecurityError('Command is required for Bash operation');
    }

    // Validate command
    const validation = this.bashValidator.validate(command);
    if (!validation.valid) {
      throw new SecurityError(`Command validation failed: ${validation.reason}`);
    }

    // Wrap command to run within workspace
    // This ensures that relative paths are resolved within the workspace
    toolInput.command = `cd ${this.allowedWorkspace} && ${command}`;

    return toolInput;
  }

  async validateSearchTool(toolName, toolInput) {
    // For Grep and Glob, validate the path if provided
    const path = toolInput.path;

    if (path) {
      const pathValidation = await this.pathValidator.validate(path);
      if (!pathValidation.valid) {
        throw new SecurityError(`Path validation failed: ${pathValidation.reason}`);
      }
      toolInput.path = pathValidation.normalizedPath;
    }

    // Validate pattern for potential injection
    const pattern = toolInput.pattern;
    if (pattern && typeof pattern === 'string') {
      // Check for dangerous regex patterns
      if (pattern.length > 1000) {
        throw new SecurityError('Pattern too long (max 1000 characters)');
      }

      // Check for ReDoS patterns (catastrophic backtracking)
      const dangerousRegexPatterns = [
        /\(\.\*\)\+/,
        /\(.*\)\{/,
        /\[\^.*\]\*/,
      ];

      for (const dangerous of dangerousRegexPatterns) {
        if (dangerous.test(pattern)) {
          throw new SecurityError('Potentially dangerous regex pattern detected');
        }
      }
    }

    return toolInput;
  }

  async validateNetworkTool(toolName, toolInput) {
    // For now, network tools are allowed but monitored
    // You can add URL whitelist/blacklist here

    const url = toolInput.url;
    if (url) {
      // Block localhost/internal IPs
      const blockedPatterns = [
        /localhost/i,
        /127\.0\.0\.1/,
        /192\.168\./,
        /10\./,
        /172\.(1[6-9]|2[0-9]|3[0-1])\./,
        /169\.254\./,  // Link-local
        /::1/,         // IPv6 localhost
      ];

      for (const pattern of blockedPatterns) {
        if (pattern.test(url)) {
          throw new SecurityError('Access to internal URLs is not allowed');
        }
      }

      // Ensure HTTPS for external requests
      if (!url.startsWith('https://') && !url.startsWith('http://')) {
        throw new SecurityError('Only HTTP/HTTPS URLs are allowed');
      }
    }

    return toolInput;
  }

  getStats() {
    return {
      ...this.stats,
      blockRate: this.stats.totalCalls > 0
        ? ((this.stats.blocked / this.stats.totalCalls) * 100).toFixed(2) + '%'
        : '0%'
    };
  }
}

// ============================================================================
// 3. RESOURCE LIMITER
// ============================================================================

export class ResourceLimiter {
  constructor(config = {}) {
    this.limits = {
      operationTimeout: config.operationTimeout || 30000,      // 30 seconds
      maxMemoryMB: config.maxMemoryMB || 512,                 // 512MB
      maxConcurrent: config.maxConcurrent || 5,               // 5 concurrent ops
      maxTokens: config.maxTokens || 100000,                  // 100k tokens
    };

    this.currentUsage = {
      concurrentOps: 0,
      totalTokens: 0,
    };
  }

  async enforceLimit(operation, context = {}) {
    // Check concurrent operations
    if (this.currentUsage.concurrentOps >= this.limits.maxConcurrent) {
      throw new ResourceLimitError(
        `Too many concurrent operations (max: ${this.limits.maxConcurrent})`
      );
    }

    this.currentUsage.concurrentOps++;
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;

    try {
      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Operation timeout after ${this.limits.operationTimeout}ms`));
        }, this.limits.operationTimeout);
      });

      // Create memory monitor
      const memoryMonitor = setInterval(() => {
        const currentMemory = process.memoryUsage().heapUsed;
        const memoryUsedMB = (currentMemory - startMemory) / 1024 / 1024;

        if (memoryUsedMB > this.limits.maxMemoryMB) {
          clearInterval(memoryMonitor);
          throw new ResourceLimitError(
            `Memory limit exceeded: ${memoryUsedMB.toFixed(2)}MB / ${this.limits.maxMemoryMB}MB`
          );
        }
      }, 1000);

      // Race between operation and timeout
      const result = await Promise.race([
        operation(),
        timeoutPromise
      ]);

      clearInterval(memoryMonitor);

      // Track token usage if provided
      if (context.tokensUsed) {
        this.currentUsage.totalTokens += context.tokensUsed;

        if (this.currentUsage.totalTokens > this.limits.maxTokens) {
          throw new ResourceLimitError(
            `Token limit exceeded: ${this.currentUsage.totalTokens} / ${this.limits.maxTokens}`
          );
        }
      }

      const duration = Date.now() - startTime;
      console.log(`✅ Operation completed in ${duration}ms`);

      return result;
    } finally {
      this.currentUsage.concurrentOps--;
    }
  }

  reset() {
    this.currentUsage = {
      concurrentOps: 0,
      totalTokens: 0,
    };
  }

  getUsage() {
    return {
      ...this.currentUsage,
      limits: this.limits
    };
  }
}

// ============================================================================
// 4. INPUT SANITIZER
// ============================================================================

export class InputSanitizer {
  constructor() {
    this.maxPromptLength = 10000;

    this.dangerousPatterns = [
      { pattern: /ignore\s+(all\s+)?previous\s+instructions/i, name: 'Instruction override' },
      { pattern: /system\s+(message|prompt|instruction)/i, name: 'System impersonation' },
      { pattern: /admin\s+(mode|access|privileges?)/i, name: 'Admin mode request' },
      { pattern: /authorization\s+level/i, name: 'Authorization manipulation' },
      { pattern: /security\s+(disabled?|off|bypass)/i, name: 'Security disable' },
      { pattern: /\[SYSTEM\]/i, name: 'System marker' },
      { pattern: /\[ADMIN\]/i, name: 'Admin marker' },
      { pattern: /jailbreak/i, name: 'Jailbreak attempt' },
      { pattern: /DAN\s+mode/i, name: 'DAN mode' },
      { pattern: /you\s+are\s+now/i, name: 'Role redefinition' },
    ];
  }

  sanitize(userPrompt) {
    if (!userPrompt || typeof userPrompt !== 'string') {
      throw new ValidationError('Prompt must be a non-empty string');
    }

    // Length check
    if (userPrompt.length > this.maxPromptLength) {
      throw new ValidationError(
        `Prompt too long (${userPrompt.length} > ${this.maxPromptLength} characters)`
      );
    }

    let sanitized = userPrompt;

    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');

    // Remove control characters (keep newlines and tabs)
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    // Check for dangerous patterns
    for (const { pattern, name } of this.dangerousPatterns) {
      if (pattern.test(sanitized)) {
        throw new SecurityError(`Dangerous prompt pattern detected: ${name}`);
      }
    }

    // Normalize whitespace
    sanitized = sanitized.replace(/\s+/g, ' ').trim();

    return sanitized;
  }
}

// ============================================================================
// 5. OUTPUT SANITIZER
// ============================================================================

export class OutputSanitizer {
  constructor() {
    this.maxOutputLength = 50000;  // 50KB

    this.secretPatterns = [
      { pattern: /sk-[a-zA-Z0-9]{32,}/g, replacement: 'sk-***REDACTED***', name: 'Anthropic API key' },
      { pattern: /ghp_[a-zA-Z0-9]{36}/g, replacement: 'ghp-***REDACTED***', name: 'GitHub PAT' },
      { pattern: /gho_[a-zA-Z0-9]{36}/g, replacement: 'gho-***REDACTED***', name: 'GitHub OAuth' },
      { pattern: /AKIA[0-9A-Z]{16}/g, replacement: 'AKIA***REDACTED***', name: 'AWS Access Key' },
      { pattern: /password[\s:=]+[^\s"']+/gi, replacement: 'password=***REDACTED***', name: 'Password' },
      { pattern: /api[_-]?key[\s:=]+[^\s"']+/gi, replacement: 'api_key=***REDACTED***', name: 'API Key' },
      { pattern: /secret[\s:=]+[^\s"']+/gi, replacement: 'secret=***REDACTED***', name: 'Secret' },
      { pattern: /token[\s:=]+[^\s"']+/gi, replacement: 'token=***REDACTED***', name: 'Token' },
      { pattern: /-----BEGIN [A-Z ]+ KEY-----[\s\S]*?-----END [A-Z ]+ KEY-----/g, replacement: '[PRIVATE KEY REDACTED]', name: 'Private Key' },
      { pattern: /eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, replacement: 'eyJ***REDACTED_JWT***', name: 'JWT' },
      { pattern: /postgres:\/\/[^@]+@[^\s]+/gi, replacement: 'postgres://***REDACTED***', name: 'PostgreSQL URL' },
      { pattern: /mysql:\/\/[^@]+@[^\s]+/gi, replacement: 'mysql://***REDACTED***', name: 'MySQL URL' },
      { pattern: /mongodb(\+srv)?:\/\/[^@]+@[^\s]+/gi, replacement: 'mongodb://***REDACTED***', name: 'MongoDB URL' },
    ];
  }

  sanitize(output) {
    if (!output) return '';

    let sanitized = String(output);

    // Length limit
    if (sanitized.length > this.maxOutputLength) {
      sanitized = sanitized.substring(0, this.maxOutputLength) + '\n[... output truncated]';
    }

    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');

    // Remove control characters (keep newlines, tabs)
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    // Escape HTML
    sanitized = this.escapeHtml(sanitized);

    // Scrub secrets
    sanitized = this.scrubSecrets(sanitized);

    return sanitized;
  }

  escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .replace(/\//g, '&#x2F;');
  }

  scrubSecrets(text) {
    let scrubbed = text;
    let scrubCount = 0;

    for (const { pattern, replacement, name } of this.secretPatterns) {
      const before = scrubbed;
      scrubbed = scrubbed.replace(pattern, replacement);

      if (scrubbed !== before) {
        scrubCount++;
        console.warn(`⚠️ Scrubbed ${name} from output`);
      }
    }

    if (scrubCount > 0) {
      console.warn(`⚠️ Total secrets scrubbed: ${scrubCount}`);
    }

    return scrubbed;
  }
}

// ============================================================================
// 6. SECURE CLAUDE CODE SDK MANAGER
// ============================================================================

export class SecureClaudeCodeSDKManager {
  constructor() {
    this.workingDirectory = '/workspaces/agent-feed/prod';
    this.allowedWorkspace = '/workspaces/agent-feed/prod/agent_workspace';
    this.model = 'claude-sonnet-4-20250514';
    this.initialized = false;

    // Security components
    this.toolInterceptor = new SecureToolInterceptor({
      allowedWorkspace: this.allowedWorkspace
    });
    this.resourceLimiter = new ResourceLimiter();
    this.inputSanitizer = new InputSanitizer();
    this.outputSanitizer = new OutputSanitizer();

    this.init();
  }

  async init() {
    this.initialized = true;
    console.log('✅ Secure Claude Code SDK Manager initialized');
    console.log(`🔒 Workspace boundary: ${this.allowedWorkspace}`);
    console.log(`🛡️ Security layers: Tool Validation, Resource Limits, I/O Sanitization`);
  }

  async createStreamingChat(userInput, options = {}) {
    if (!this.initialized) await this.init();

    try {
      // 1. Sanitize input
      const sanitizedInput = this.inputSanitizer.sanitize(userInput);

      // 2. Execute with resource limits
      const result = await this.resourceLimiter.enforceLimit(async () => {
        return await this.secureQuery(sanitizedInput, options);
      });

      // 3. Sanitize outputs
      const sanitizedResult = this.sanitizeResult(result);

      return [{
        type: 'assistant',
        content: sanitizedResult,
        timestamp: new Date().toISOString(),
        model: this.model,
        secure: true,
        messages: result.messages
      }];
    } catch (error) {
      console.error('❌ Secure chat error:', error.message);

      // Don't leak error details to user
      throw new Error('Request failed due to security policy or resource limits');
    }
  }

  async secureQuery(prompt, options = {}) {
    const queryOptions = {
      cwd: this.workingDirectory,
      model: options.model || this.model,
      maxTurns: Math.min(options.maxTurns || 10, 10),  // Cap at 10

      // CRITICAL: Intercept all tool calls for validation
      beforeToolCall: async (toolName, toolInput) => {
        return await this.toolInterceptor.interceptToolCall(toolName, toolInput);
      }
    };

    const messages = [];
    const queryResponse = query({
      prompt: prompt,
      options: queryOptions
    });

    for await (const message of queryResponse) {
      messages.push(message);
    }

    return {
      messages,
      success: true
    };
  }

  sanitizeResult(result) {
    if (!result.messages || result.messages.length === 0) {
      return 'No response generated';
    }

    const lastMessage = result.messages[result.messages.length - 1];
    const content = this.extractContent(lastMessage);

    return this.outputSanitizer.sanitize(content);
  }

  extractContent(message) {
    if (message.type === 'assistant' && message.message) {
      if (typeof message.message.content === 'string') {
        return message.message.content;
      } else if (Array.isArray(message.message.content)) {
        return message.message.content
          .filter(item => item.type === 'text')
          .map(item => item.text)
          .join('');
      }
    } else if (message.type === 'result') {
      return message.result || 'Task completed';
    }
    return 'Response received';
  }

  getSecurityStats() {
    return {
      toolInterceptor: this.toolInterceptor.getStats(),
      resourceLimiter: this.resourceLimiter.getUsage(),
    };
  }
}

// ============================================================================
// CUSTOM ERRORS
// ============================================================================

class SecurityError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SecurityError';
  }
}

class ResourceLimitError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ResourceLimitError';
  }
}

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

// ============================================================================
// INTEGRATION WITH ROUTES
// ============================================================================

/**
 * Example: How to integrate with your API routes
 *
 * File: src/api/routes/claude-code-sdk.js
 */
export function secureRouteExample() {
  const router = express.Router();
  const rateLimiter = new RateLimiter({ maxOperations: 10, windowMs: 60000 });
  const secureManager = new SecureClaudeCodeSDKManager();

  router.post('/streaming-chat', async (req, res) => {
    const userId = req.ip || req.session?.id || 'anonymous';

    // 1. Rate limiting
    const rateCheck = rateLimiter.checkLimit(userId);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        retryAfter: rateCheck.retryAfter
      });
    }

    try {
      // 2. Execute with all security layers
      const { message, options = {} } = req.body;
      const responses = await secureManager.createStreamingChat(message, options);

      // 3. Return sanitized response
      res.json({
        success: true,
        responses: responses,
        timestamp: new Date().toISOString(),
        secure: true
      });
    } catch (error) {
      // 4. Don't leak error details
      console.error('Secure chat error:', error);

      res.status(500).json({
        success: false,
        error: 'Request failed. Please try again.',
        // Don't include error.message - could leak sensitive info
      });
    }
  });

  return router;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default SecureClaudeCodeSDKManager;
