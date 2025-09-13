/**
 * Validation and Security Service
 * Multi-layered security validation for Agent Dynamic Pages
 */

import * as z from 'zod';
import DOMPurify from 'isomorphic-dompurify';

import type {
  AgentPageSpec,
  ComponentSpec,
  DataBinding,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  SecurityConfig,
  SanitizationConfig,
  ContentSecurityPolicy,
  PerformanceBudget,
  SecurityContext,
  MemoryReport,
  RuntimeContext
} from '../types/agent-dynamic-pages';

import { componentRegistry } from './ComponentRegistry';

// Security violation types
interface SecurityViolation {
  type: 'BLOCKED_PROP' | 'MALICIOUS_CONTENT' | 'RESOURCE_LIMIT' | 'UNSAFE_URL' | 'SCRIPT_INJECTION';
  severity: 'low' | 'medium' | 'high' | 'critical';
  component?: string;
  field?: string;
  value?: any;
  message: string;
  blocked: boolean;
}

interface SecurityContext {
  pageId: string;
  userId: string;
  permissions: string[];
  resourceLimits: PerformanceBudget;
  violations: SecurityViolation[];
  blocked: boolean;
  riskScore: number;
}

interface MemoryReport {
  current: number;
  peak: number;
  limit: number;
  percentage: number;
  warning: boolean;
  critical: boolean;
}

/**
 * Core validation and security service
 */
export class ValidationSecurityService {
  private static instance: ValidationSecurityService;
  private performanceBudget: PerformanceBudget;
  private securityContext = new Map<string, SecurityContext>();
  private memoryTracking = new Map<string, MemoryReport>();
  private renderTimeouts = new Map<string, NodeJS.Timeout>();

  private constructor() {
    this.performanceBudget = {
      maxInitialLoadTime: 2000, // 2 seconds
      maxInteractionTime: 100, // 100ms
      maxMemoryUsage: 50 * 1024 * 1024, // 50MB
      maxDOMNodes: 1000,
      maxApiCalls: 10,
      maxBundleSize: 500 * 1024 // 500KB
    };

    // Initialize DOMPurify with strict settings
    if (typeof window !== 'undefined') {
      DOMPurify.setConfig({
        ALLOWED_TAGS: ['p', 'div', 'span', 'strong', 'em', 'i', 'b', 'u', 'br', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
        ALLOWED_ATTR: ['class', 'id', 'data-testid', 'aria-label', 'aria-describedby', 'role'],
        FORBID_ATTR: ['style', 'on*'],
        FORBID_TAGS: ['script', 'object', 'embed', 'link', 'meta', 'iframe'],
        KEEP_CONTENT: false,
        FORCE_BODY: true
      });
    }
  }

  public static getInstance(): ValidationSecurityService {
    if (!ValidationSecurityService.instance) {
      ValidationSecurityService.instance = new ValidationSecurityService();
    }
    return ValidationSecurityService.instance;
  }

  /**
   * Comprehensive page specification validation
   */
  validatePageSpec(spec: AgentPageSpec): ValidationResult<AgentPageSpec> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const violations: SecurityViolation[] = [];

    try {
      // Schema validation
      const schemaResult = this.validateSchema(spec);
      errors.push(...schemaResult.errors);
      warnings.push(...schemaResult.warnings);

      // Security validation
      const securityResult = this.validateSecurity(spec);
      violations.push(...securityResult.violations);
      
      // Component validation
      const componentResult = this.validateComponents(spec.components);
      errors.push(...componentResult.errors);
      warnings.push(...componentResult.warnings);

      // Data binding validation
      const dataBindingResult = this.validateDataBindings(spec.dataBindings);
      errors.push(...dataBindingResult.errors);
      warnings.push(...dataBindingResult.warnings);

      // Performance validation
      const performanceResult = this.validatePerformance(spec);
      warnings.push(...performanceResult.warnings);

      // Convert critical violations to errors
      const criticalViolations = violations.filter(v => v.severity === 'critical' || v.severity === 'high');
      errors.push(...criticalViolations.map(v => ({
        message: v.message,
        code: v.type,
        severity: 'error' as const,
        field: v.field,
        context: { component: v.component, blocked: v.blocked }
      })));

      // Add medium severity violations as warnings
      const mediumViolations = violations.filter(v => v.severity === 'medium');
      warnings.push(...mediumViolations.map(v => ({
        message: v.message,
        code: v.type,
        field: v.field,
        suggestion: `Consider reviewing ${v.component || 'the component'} for security best practices`
      })));

      const isValid = errors.length === 0;

      return {
        valid: isValid,
        data: isValid ? this.sanitizePageSpec(spec) : undefined,
        errors,
        warnings,
        sanitized: isValid ? this.sanitizePageSpec(spec) : undefined
      };

    } catch (error) {
      return {
        valid: false,
        errors: [{
          message: error instanceof Error ? error.message : 'Unknown validation error',
          code: 'VALIDATION_EXCEPTION',
          severity: 'error'
        }],
        warnings
      };
    }
  }

  /**
   * Schema-based validation using Zod
   */
  private validateSchema(spec: AgentPageSpec): { errors: ValidationError[]; warnings: ValidationWarning[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Define schema for AgentPageSpec
    const pageSpecSchema = z.object({
      id: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/, 'ID must contain only alphanumeric characters, underscores, and hyphens'),
      version: z.number().int().positive(),
      metadata: z.object({
        title: z.string().min(1).max(200),
        description: z.string().max(1000),
        author: z.string().min(1).max(100),
        created: z.date(),
        updated: z.date(),
        tags: z.array(z.string().max(50)).max(10)
      }),
      layout: z.object({
        type: z.enum(['single', 'grid', 'flex', 'masonry', 'sections']),
        columns: z.number().int().min(1).max(12).optional(),
        spacing: z.enum(['sm', 'md', 'lg', 'xl']).optional(),
        responsive: z.boolean().optional()
      }),
      components: z.array(z.any()).max(100), // Detailed validation done separately
      dataBindings: z.array(z.any()).max(50), // Detailed validation done separately
      theme: z.object({
        primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Primary color must be a valid hex color').optional(),
        secondaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Secondary color must be a valid hex color').optional(),
        mode: z.enum(['light', 'dark', 'auto', 'system']).optional()
      }),
      interactions: z.array(z.any()).max(20),
      security: z.object({
        allowedDomains: z.array(z.string().url()).max(20),
        allowedApiEndpoints: z.array(z.string().url()).max(10),
        maxRenderTime: z.number().int().min(100).max(10000),
        memoryLimit: z.number().int().min(1024).max(100 * 1024 * 1024),
        maxDOMNodes: z.number().int().min(10).max(2000)
      })
    });

    try {
      pageSpecSchema.parse(spec);
    } catch (error) {
      if (error instanceof z.ZodError) {
        errors.push(...error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code.toUpperCase(),
          severity: 'error' as const,
          context: { value: err.path.length > 0 ? this.getNestedValue(spec, err.path) : spec }
        })));
      }
    }

    // Additional semantic validations
    if (spec.components.length === 0) {
      warnings.push({
        message: 'Page has no components defined',
        code: 'EMPTY_PAGE',
        suggestion: 'Add at least one component to make the page functional'
      });
    }

    if (spec.metadata.title.length < 3) {
      warnings.push({
        message: 'Page title is very short',
        code: 'SHORT_TITLE',
        suggestion: 'Consider using a more descriptive title for better user experience'
      });
    }

    return { errors, warnings };
  }

  /**
   * Security-focused validation
   */
  private validateSecurity(spec: AgentPageSpec): { violations: SecurityViolation[] } {
    const violations: SecurityViolation[] = [];

    // Check for dangerous patterns in spec
    const specString = JSON.stringify(spec);
    
    // Script injection detection
    const scriptPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /data:text\/html/gi,
      /vbscript:/gi,
      /on\w+\s*=/gi,
      /eval\s*\(/gi,
      /Function\s*\(/gi,
      /setTimeout\s*\(/gi,
      /setInterval\s*\(/gi
    ];

    scriptPatterns.forEach((pattern, index) => {
      if (pattern.test(specString)) {
        violations.push({
          type: 'SCRIPT_INJECTION',
          severity: 'critical',
          message: `Potential script injection detected (pattern ${index + 1})`,
          blocked: true
        });
      }
    });

    // URL validation
    this.extractUrls(specString).forEach(url => {
      if (!this.isUrlSafe(url, spec.security.allowedDomains)) {
        violations.push({
          type: 'UNSAFE_URL',
          severity: 'high',
          message: `Unsafe or disallowed URL detected: ${url}`,
          value: url,
          blocked: true
        });
      }
    });

    // Resource limits validation
    if (spec.components.length > 100) {
      violations.push({
        type: 'RESOURCE_LIMIT',
        severity: 'medium',
        message: 'Too many components may affect performance',
        value: spec.components.length,
        blocked: false
      });
    }

    if (spec.dataBindings.length > 20) {
      violations.push({
        type: 'RESOURCE_LIMIT',
        severity: 'medium',
        message: 'Too many data bindings may affect performance',
        value: spec.dataBindings.length,
        blocked: false
      });
    }

    // Memory usage estimation
    const estimatedMemory = this.estimateMemoryUsage(spec);
    if (estimatedMemory > spec.security.memoryLimit) {
      violations.push({
        type: 'RESOURCE_LIMIT',
        severity: 'high',
        message: `Estimated memory usage (${Math.round(estimatedMemory / 1024)}KB) exceeds limit (${Math.round(spec.security.memoryLimit / 1024)}KB)`,
        blocked: true
      });
    }

    return { violations };
  }

  /**
   * Component-specific validation
   */
  private validateComponents(components: ComponentSpec[]): { errors: ValidationError[]; warnings: ValidationWarning[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    components.forEach((component, index) => {
      // Check if component type exists
      if (!componentRegistry.hasComponent(component.type)) {
        errors.push({
          field: `components[${index}].type`,
          message: `Unknown component type: ${component.type}`,
          code: 'UNKNOWN_COMPONENT',
          severity: 'error',
          context: { componentId: component.id }
        });
        return;
      }

      // Validate component props
      const validation = componentRegistry.validateComponentSpec(component.type, component.props);
      if (!validation.valid) {
        errors.push(...validation.errors.map(err => ({
          ...err,
          field: `components[${index}].props.${err.field}`,
          context: { ...err.context, componentId: component.id }
        })));
      }

      // Check security policy
      const securityPolicy = componentRegistry.getSecurityPolicy(component.type);
      if (securityPolicy) {
        const propKeys = Object.keys(component.props || {});
        const blockedProps = propKeys.filter(prop => 
          securityPolicy.blockedProps?.includes(prop) ||
          !securityPolicy.allowedProps.includes(prop)
        );

        blockedProps.forEach(prop => {
          errors.push({
            field: `components[${index}].props.${prop}`,
            message: `Property '${prop}' is not allowed for component type '${component.type}'`,
            code: 'BLOCKED_PROP',
            severity: 'error',
            context: { componentId: component.id }
          });
        });

        // Check data size limits
        const dataSize = JSON.stringify(component.props).length;
        if (dataSize > securityPolicy.maxDataSize) {
          warnings.push({
            field: `components[${index}]`,
            message: `Component props size (${dataSize} bytes) exceeds recommended limit (${securityPolicy.maxDataSize} bytes)`,
            code: 'LARGE_COMPONENT_DATA',
            suggestion: 'Consider reducing the amount of data in component props'
          });
        }
      }

      // Validate children recursively
      if (component.children && component.children.length > 0) {
        const childValidation = this.validateComponents(component.children);
        errors.push(...childValidation.errors.map(err => ({
          ...err,
          field: `components[${index}].children.${err.field}`
        })));
        warnings.push(...childValidation.warnings.map(warn => ({
          ...warn,
          field: `components[${index}].children.${warn.field}`
        })));
      }
    });

    return { errors, warnings };
  }

  /**
   * Data binding validation
   */
  private validateDataBindings(bindings: DataBinding[]): { errors: ValidationError[]; warnings: ValidationWarning[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const bindingIds = new Set<string>();

    bindings.forEach((binding, index) => {
      // Check for duplicate IDs
      if (bindingIds.has(binding.id)) {
        errors.push({
          field: `dataBindings[${index}].id`,
          message: `Duplicate data binding ID: ${binding.id}`,
          code: 'DUPLICATE_BINDING_ID',
          severity: 'error'
        });
      }
      bindingIds.add(binding.id);

      // Validate API endpoints
      if (binding.source === 'api' && binding.config.api) {
        const apiConfig = binding.config.api;
        
        // URL validation
        try {
          new URL(apiConfig.endpoint);
        } catch {
          errors.push({
            field: `dataBindings[${index}].config.api.endpoint`,
            message: `Invalid API endpoint URL: ${apiConfig.endpoint}`,
            code: 'INVALID_API_URL',
            severity: 'error'
          });
        }

        // Method validation
        const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
        if (!allowedMethods.includes(apiConfig.method)) {
          errors.push({
            field: `dataBindings[${index}].config.api.method`,
            message: `Invalid HTTP method: ${apiConfig.method}`,
            code: 'INVALID_HTTP_METHOD',
            severity: 'error'
          });
        }

        // Security headers check
        if (apiConfig.headers) {
          const dangerousHeaders = ['cookie', 'authorization', 'x-api-key'];
          const headerKeys = Object.keys(apiConfig.headers).map(h => h.toLowerCase());
          const foundDangerous = headerKeys.filter(h => dangerousHeaders.includes(h));
          
          if (foundDangerous.length > 0) {
            warnings.push({
              field: `dataBindings[${index}].config.api.headers`,
              message: `Potentially sensitive headers detected: ${foundDangerous.join(', ')}`,
              code: 'SENSITIVE_HEADERS',
              suggestion: 'Consider using authentication configuration instead of direct headers'
            });
          }
        }
      }

      // Validate computed functions
      if (binding.source === 'computed' && binding.config.computed) {
        const computedConfig = binding.config.computed;
        
        // Check for dangerous patterns in function code
        if (computedConfig.function) {
          const dangerousPatterns = [
            /eval\s*\(/gi,
            /Function\s*\(/gi,
            /setTimeout\s*\(/gi,
            /setInterval\s*\(/gi,
            /import\s*\(/gi,
            /require\s*\(/gi,
            /process\./gi,
            /global\./gi,
            /window\./gi
          ];

          dangerousPatterns.forEach((pattern, patternIndex) => {
            if (pattern.test(computedConfig.function)) {
              errors.push({
                field: `dataBindings[${index}].config.computed.function`,
                message: `Dangerous pattern detected in computed function (pattern ${patternIndex + 1})`,
                code: 'DANGEROUS_COMPUTED_FUNCTION',
                severity: 'error'
              });
            }
          });
        }

        // Validate dependencies
        computedConfig.dependencies.forEach((dep, depIndex) => {
          if (!bindingIds.has(dep) && dep !== binding.id) {
            warnings.push({
              field: `dataBindings[${index}].config.computed.dependencies[${depIndex}]`,
              message: `Computed function depends on undefined binding: ${dep}`,
              code: 'UNDEFINED_DEPENDENCY',
              suggestion: 'Ensure all dependencies are defined before this binding'
            });
          }
        });
      }
    });

    return { errors, warnings };
  }

  /**
   * Performance validation
   */
  private validatePerformance(spec: AgentPageSpec): { warnings: ValidationWarning[] } {
    const warnings: ValidationWarning[] = [];

    // Estimate component count
    const componentCount = this.countComponents(spec.components);
    if (componentCount > 50) {
      warnings.push({
        message: `High component count (${componentCount}) may affect performance`,
        code: 'HIGH_COMPONENT_COUNT',
        suggestion: 'Consider lazy loading or virtualization for better performance'
      });
    }

    // Check for deeply nested components
    const maxDepth = this.getMaxDepth(spec.components);
    if (maxDepth > 10) {
      warnings.push({
        message: `Deep component nesting (${maxDepth} levels) may affect rendering performance`,
        code: 'DEEP_COMPONENT_NESTING',
        suggestion: 'Consider flattening the component structure'
      });
    }

    // Estimate bundle impact
    const specSize = JSON.stringify(spec).length;
    if (specSize > 100 * 1024) { // 100KB
      warnings.push({
        message: `Large page specification (${Math.round(specSize / 1024)}KB) may affect loading performance`,
        code: 'LARGE_PAGE_SPEC',
        suggestion: 'Consider breaking the page into smaller sections or using dynamic imports'
      });
    }

    return { warnings };
  }

  /**
   * Sanitize page specification
   */
  private sanitizePageSpec(spec: AgentPageSpec): AgentPageSpec {
    const sanitized = JSON.parse(JSON.stringify(spec));

    // Sanitize all string values
    this.sanitizeObjectStrings(sanitized);

    // Sanitize components
    sanitized.components = this.sanitizeComponents(sanitized.components);

    return sanitized;
  }

  /**
   * Sanitize components recursively
   */
  private sanitizeComponents(components: ComponentSpec[]): ComponentSpec[] {
    return components.map(component => {
      const sanitizedComponent = { ...component };

      // Sanitize props using component registry
      const mapper = (componentRegistry as any)[component.type];
      if (mapper) {
        sanitizedComponent.props = mapper.sanitizer(component.props);
      }

      // Sanitize children recursively
      if (component.children) {
        sanitizedComponent.children = this.sanitizeComponents(component.children);
      }

      return sanitizedComponent;
    });
  }

  /**
   * Runtime security enforcement
   */
  enforceSecurityPolicies(pageId: string, userId: string, context: RuntimeContext): SecurityContext {
    const existing = this.securityContext.get(pageId);
    if (existing) {
      return existing;
    }

    const securityContext: SecurityContext = {
      pageId,
      userId,
      permissions: context.permissions || [],
      resourceLimits: this.performanceBudget,
      violations: [],
      blocked: false,
      riskScore: 0
    };

    this.securityContext.set(pageId, securityContext);
    return securityContext;
  }

  /**
   * Sanitize user input
   */
  sanitizeUserInput(input: any, bindingId: string): any {
    if (typeof input === 'string') {
      // Use DOMPurify for HTML sanitization
      if (typeof window !== 'undefined') {
        return DOMPurify.sanitize(input, {
          ALLOWED_TAGS: [],
          ALLOWED_ATTR: [],
          KEEP_CONTENT: true
        });
      }
      
      // Server-side sanitization fallback
      return input
        .replace(/[<>'"]/g, (match) => {
          const htmlEntities: { [key: string]: string } = {
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#x27;',
            '"': '&quot;'
          };
          return htmlEntities[match] || match;
        });
    }

    if (typeof input === 'object' && input !== null) {
      const sanitized: any = Array.isArray(input) ? [] : {};
      for (const [key, value] of Object.entries(input)) {
        sanitized[key] = this.sanitizeUserInput(value, bindingId);
      }
      return sanitized;
    }

    return input;
  }

  /**
   * Validate API calls
   */
  validateApiCalls(endpoint: string, pageId: string): boolean {
    const context = this.securityContext.get(pageId);
    if (!context) return false;

    try {
      const url = new URL(endpoint);
      
      // Check against allowed domains (if any are specified)
      // Note: This would typically come from the page spec's security config
      const allowedDomains = ['api.example.com', 'localhost']; // This should come from config
      
      if (allowedDomains.length > 0) {
        const isAllowed = allowedDomains.some(domain => 
          url.hostname === domain || url.hostname.endsWith(`.${domain}`)
        );
        
        if (!isAllowed) {
          context.violations.push({
            type: 'UNSAFE_URL',
            severity: 'high',
            message: `API call to disallowed domain: ${url.hostname}`,
            blocked: true
          });
          return false;
        }
      }

      return true;
    } catch {
      context.violations.push({
        type: 'UNSAFE_URL',
        severity: 'medium',
        message: `Invalid API endpoint URL: ${endpoint}`,
        blocked: true
      });
      return false;
    }
  }

  /**
   * Enforce render timeout
   */
  enforceRenderTimeout(pageId: string): void {
    const existingTimeout = this.renderTimeouts.get(pageId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const timeout = setTimeout(() => {
      console.warn(`Render timeout exceeded for page: ${pageId}`);
      const context = this.securityContext.get(pageId);
      if (context) {
        context.violations.push({
          type: 'RESOURCE_LIMIT',
          severity: 'high',
          message: 'Page rendering exceeded maximum allowed time',
          blocked: true
        });
      }
    }, this.performanceBudget.maxInitialLoadTime);

    this.renderTimeouts.set(pageId, timeout);
  }

  /**
   * Check memory usage
   */
  checkMemoryUsage(pageId: string): MemoryReport {
    const existing = this.memoryTracking.get(pageId);
    const currentMemory = this.getCurrentMemoryUsage();
    
    const report: MemoryReport = {
      current: currentMemory,
      peak: Math.max(existing?.peak || 0, currentMemory),
      limit: this.performanceBudget.maxMemoryUsage,
      percentage: (currentMemory / this.performanceBudget.maxMemoryUsage) * 100,
      warning: currentMemory > this.performanceBudget.maxMemoryUsage * 0.8,
      critical: currentMemory > this.performanceBudget.maxMemoryUsage
    };

    this.memoryTracking.set(pageId, report);
    return report;
  }

  /**
   * Validate asset size
   */
  validateAssetSize(asset: any): boolean {
    const assetSize = JSON.stringify(asset).length;
    return assetSize <= 10 * 1024 * 1024; // 10MB limit
  }

  // Helper methods
  private getNestedValue(obj: any, path: (string | number)[]): any {
    return path.reduce((current, key) => current?.[key], obj);
  }

  private extractUrls(text: string): string[] {
    const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/gi;
    return text.match(urlRegex) || [];
  }

  private isUrlSafe(url: string, allowedDomains: string[]): boolean {
    try {
      const urlObj = new URL(url);
      
      // Block dangerous protocols
      const allowedProtocols = ['http:', 'https:'];
      if (!allowedProtocols.includes(urlObj.protocol)) {
        return false;
      }

      // Check domain whitelist
      if (allowedDomains.length > 0) {
        return allowedDomains.some(domain => 
          urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`)
        );
      }

      return true;
    } catch {
      return false;
    }
  }

  private estimateMemoryUsage(spec: AgentPageSpec): number {
    const specSize = JSON.stringify(spec).length;
    const componentCount = this.countComponents(spec.components);
    
    // Rough estimation: 1KB base + 2KB per component + spec size
    return 1024 + (componentCount * 2048) + specSize;
  }

  private countComponents(components: ComponentSpec[]): number {
    let count = components.length;
    components.forEach(component => {
      if (component.children) {
        count += this.countComponents(component.children);
      }
    });
    return count;
  }

  private getMaxDepth(components: ComponentSpec[], currentDepth = 0): number {
    if (components.length === 0) return currentDepth;
    
    let maxDepth = currentDepth;
    components.forEach(component => {
      if (component.children) {
        const childDepth = this.getMaxDepth(component.children, currentDepth + 1);
        maxDepth = Math.max(maxDepth, childDepth);
      }
    });
    
    return maxDepth;
  }

  private sanitizeObjectStrings(obj: any): void {
    if (typeof obj === 'object' && obj !== null) {
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
          if (typeof window !== 'undefined') {
            obj[key] = DOMPurify.sanitize(value, {
              ALLOWED_TAGS: [],
              ALLOWED_ATTR: [],
              KEEP_CONTENT: true
            });
          } else {
            // Server-side fallback
            obj[key] = value.replace(/[<>'"&]/g, (match) => {
              const htmlEntities: { [key: string]: string } = {
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#x27;',
                '"': '&quot;',
                '&': '&amp;'
              };
              return htmlEntities[match] || match;
            });
          }
        } else if (typeof value === 'object') {
          this.sanitizeObjectStrings(value);
        }
      }
    }
  }

  private getCurrentMemoryUsage(): number {
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in (window.performance as any)) {
      return (window.performance as any).memory.usedJSHeapSize;
    }
    return 0; // Fallback for environments without memory API
  }

  /**
   * Clean up resources
   */
  cleanup(pageId: string): void {
    this.securityContext.delete(pageId);
    this.memoryTracking.delete(pageId);
    
    const timeout = this.renderTimeouts.get(pageId);
    if (timeout) {
      clearTimeout(timeout);
      this.renderTimeouts.delete(pageId);
    }
  }
}

// Export singleton instance
export const validationSecurityService = ValidationSecurityService.getInstance();