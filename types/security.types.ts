// Agent Dynamic Pages - Security Type Definitions

export interface SecurityViolation {
  type: SecurityViolationType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details: string;
  field?: string;
  value?: any;
  suggestion?: string;
  timestamp: Date;
}

export type SecurityViolationType =
  | 'xss_attempt'
  | 'sql_injection'
  | 'path_traversal'
  | 'code_injection'
  | 'dangerous_prop'
  | 'unauthorized_access'
  | 'quota_exceeded'
  | 'malformed_data'
  | 'suspicious_pattern'
  | 'rate_limit_exceeded';

export interface SecurityPolicy {
  allowedComponents: string[];
  blockedComponents: string[];
  allowedProps: Record<string, string[]>;
  blockedProps: string[];
  allowedEvents: string[];
  blockedEvents: string[];
  contentSecurityPolicy: CSPDirectives;
  resourceLimits: ResourceLimits;
  inputValidation: InputValidationRules;
}

export interface CSPDirectives {
  'default-src': string[];
  'script-src': string[];
  'style-src': string[];
  'img-src': string[];
  'font-src': string[];
  'connect-src': string[];
  'frame-src': string[];
  'object-src': string[];
}

export interface ResourceLimits {
  maxComponentsPerPage: number;
  maxNestingDepth: number;
  maxFileSize: number;
  maxCustomCSSLength: number;
  maxStoragePerWorkspace: number;
  maxPagesPerWorkspace: number;
  maxAPIRequestsPerMinute: number;
  maxWebSocketConnections: number;
}

export interface InputValidationRules {
  allowedTags: string[];
  allowedAttributes: Record<string, string[]>;
  allowedProtocols: string[];
  maxStringLength: number;
  allowedFileTypes: string[];
  customValidators: Record<string, string>;
}

export interface SecurityContext {
  agentName: string;
  sessionId: string;
  permissions: Permission[];
  restrictions: Restriction[];
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  expiresAt: Date;
}

export interface Permission {
  resource: 'workspace' | 'page' | 'component' | 'file';
  action: 'create' | 'read' | 'update' | 'delete' | 'publish' | 'share';
  scope: 'own' | 'all' | 'shared';
  conditions?: PermissionCondition[];
}

export interface PermissionCondition {
  field: string;
  operator: string;
  value: any;
}

export interface Restriction {
  type: 'time_based' | 'location_based' | 'resource_based' | 'action_based';
  description: string;
  conditions: Record<string, any>;
  severity: 'warning' | 'block';
}

export interface SecurityAuditLog {
  id: string;
  workspaceId?: string;
  agentName: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  ipAddress: string;
  userAgent: string;
  details: Record<string, any>;
  severity: 'info' | 'warning' | 'error' | 'critical';
  timestamp: Date;
}

export interface SecurityAlert {
  id: string;
  type: SecurityViolationType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  violations: SecurityViolation[];
  recommendations: string[];
  timestamp: Date;
  status: 'active' | 'acknowledged' | 'resolved';
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

export interface ContentSanitizationResult {
  original: string;
  sanitized: string;
  violations: SecurityViolation[];
  wasModified: boolean;
  allowedTags: string[];
  removedTags: string[];
  modifiedAttributes: Record<string, string>;
}

export interface ComponentSecurityValidation {
  isValid: boolean;
  violations: SecurityViolation[];
  sanitizedProps: Record<string, any>;
  allowedInContext: boolean;
  trustLevel: 'trusted' | 'sandboxed' | 'restricted' | 'blocked';
}

export interface SecurityQuota {
  type: 'storage' | 'requests' | 'connections' | 'components';
  limit: number;
  current: number;
  percentage: number;
  resetInterval: 'hourly' | 'daily' | 'weekly' | 'monthly';
  nextReset: Date;
}

export interface SecurityMetrics {
  violationsCount: number;
  blockedRequests: number;
  sanitizedContent: number;
  securityScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  lastAssessment: Date;
  recommendations: SecurityRecommendation[];
}

export interface SecurityRecommendation {
  type: 'update_policy' | 'enable_feature' | 'disable_feature' | 'review_permissions';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  description: string;
  action: string;
  estimatedImpact: string;
}

export interface RateLimitInfo {
  endpoint: string;
  limit: number;
  remaining: number;
  resetTime: Date;
  retryAfter?: number;
}

export interface SecurityToken {
  token: string;
  type: 'access' | 'refresh' | 'api' | 'websocket';
  agentName: string;
  permissions: string[];
  issuedAt: Date;
  expiresAt: Date;
  scope: string[];
}