/**
 * TypeScript Safety Guards and Type Definitions
 * Comprehensive type safety for bulletproof React components
 */

// Base types for error handling
export interface SafeComponentProps {
  onError?: (error: Error) => void;
  fallback?: React.ReactNode;
  retryable?: boolean;
}

export interface ErrorDetails {
  name: string;
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: Date;
  url: string;
  userAgent: string;
  sessionId?: string;
  userId?: string;
  context?: string;
}

export interface ComponentState<T = any> {
  data?: T;
  loading: boolean;
  error?: Error;
  lastUpdated?: Date;
  retryCount: number;
}

// API Response types
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  success: boolean;
  statusCode?: number;
  message?: string;
  timestamp?: string;
}

export interface SafeApiResponse<T = any> extends ApiResponse<T> {
  isSuccess: boolean;
  isError: boolean;
  isLoading: boolean;
  retryCount: number;
}

// Agent types with safety
export interface SafeAgent {
  id: string;
  name: string;
  display_name?: string;
  description?: string;
  status: 'active' | 'inactive' | 'error' | 'testing';
  capabilities?: string[];
  created_at?: string;
  updated_at?: string;
  avatar_color?: string;
  system_prompt?: string;
  last_used?: string;
  usage_count?: number;
  performance_metrics?: {
    success_rate?: number;
    average_response_time?: number;
    total_tokens_used?: number;
    error_count?: number;
  };
  health_status?: {
    cpu_usage?: number;
    memory_usage?: number;
    response_time?: number;
    last_heartbeat?: string;
  };
}

// Post types with safety
export interface SafePost {
  id: string;
  title?: string;
  content: string;
  authorAgent?: string;
  publishedAt?: string;
  metadata?: {
    businessImpact?: number;
    tags?: string[];
    isAgentResponse?: boolean;
  };
  likes?: number;
  comments?: number;
}

// Activity types with safety
export interface SafeActivity {
  id: string;
  agentName?: string;
  instance?: 'development' | 'production';
  type?: string;
  description?: string;
  timestamp?: Date;
  metadata?: any;
}

// Component props validation schemas
export interface ComponentValidationSchema<T> {
  required: (keyof T)[];
  optional: (keyof T)[];
  validators: {
    [K in keyof T]?: (value: T[K]) => boolean;
  };
}

// Type guards
export const isString = (value: unknown): value is string => {
  return typeof value === 'string';
};

export const isNumber = (value: unknown): value is number => {
  return typeof value === 'number' && !isNaN(value);
};

export const isBoolean = (value: unknown): value is boolean => {
  return typeof value === 'boolean';
};

export const isObject = (value: unknown): value is Record<string, any> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

export const isArray = <T>(value: unknown): value is T[] => {
  return Array.isArray(value);
};

export const isDefined = <T>(value: T | null | undefined): value is T => {
  return value !== null && value !== undefined;
};

export const isValidDate = (value: unknown): value is Date => {
  return value instanceof Date && !isNaN(value.getTime());
};

export const isValidUrl = (value: unknown): value is string => {
  if (!isString(value)) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

export const isValidEmail = (value: unknown): value is string => {
  if (!isString(value)) return false;
  const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
  return emailRegex.test(value);
};

// Agent type guards
export const isValidAgent = (value: unknown): value is SafeAgent => {
  if (!isObject(value)) return false;
  
  const agent = value as any;
  return (
    isString(agent.id) &&
    isString(agent.name) &&
    (['active', 'inactive', 'error', 'testing'].includes(agent.status))
  );
};

export const isValidPost = (value: unknown): value is SafePost => {
  if (!isObject(value)) return false;
  
  const post = value as any;
  return (
    isString(post.id) &&
    isString(post.content)
  );
};

export const isValidActivity = (value: unknown): value is SafeActivity => {
  if (!isObject(value)) return false;
  
  const activity = value as any;
  return isString(activity.id);
};

// API response type guards
export const isValidApiResponse = <T>(value: unknown): value is ApiResponse<T> => {
  if (!isObject(value)) return false;
  
  const response = value as any;
  return isBoolean(response.success);
};

// Component props validators
export const validateComponentProps = <T extends Record<string, any>>(
  props: unknown,
  schema: ComponentValidationSchema<T>
): props is T => {
  if (!isObject(props)) return false;
  
  const typedProps = props as T;
  
  // Check required props
  for (const key of schema.required) {
    if (!(key in typedProps) || typedProps[key] === undefined || typedProps[key] === null) {
      console.error(`Missing required prop: ${String(key)}`);
      return false;
    }
  }
  
  // Validate prop values
  for (const [key, validator] of Object.entries(schema.validators)) {
    const value = typedProps[key as keyof T];
    if (value !== undefined && !validator(value)) {
      console.error(`Invalid prop value for ${key}:`, value);
      return false;
    }
  }
  
  return true;
};

// Safe data transformers
export const safeParseInt = (value: unknown, fallback: number = 0): number => {
  if (isNumber(value)) return Math.floor(value);
  if (isString(value)) {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
};

export const safeParseFloat = (value: unknown, fallback: number = 0): number => {
  if (isNumber(value)) return value;
  if (isString(value)) {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
};

export const safeParseDate = (value: unknown, fallback?: Date): Date => {
  if (isValidDate(value)) return value;
  if (isString(value) || isNumber(value)) {
    const parsed = new Date(value);
    if (isValidDate(parsed)) return parsed;
  }
  return fallback || new Date();
};

export const safeParseArray = <T>(
  value: unknown,
  itemValidator?: (item: unknown) => item is T
): T[] => {
  if (!isArray(value)) return [];
  
  if (itemValidator) {
    return value.filter(itemValidator);
  }
  
  return value as T[];
};

export const safeParseObject = <T extends Record<string, any>>(
  value: unknown,
  schema?: ComponentValidationSchema<T>
): Partial<T> => {
  if (!isObject(value)) return {};
  
  if (schema && !validateComponentProps(value, schema)) {
    return {};
  }
  
  return value as T;
};

// Error boundary types
export interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  errorId?: string;
  retryCount: number;
}

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  isolate?: boolean;
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;
}

export interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
  componentName?: string;
}

// Hook types
export interface UseErrorHandlerOptions {
  maxRetries?: number;
  retryDelay?: number;
  onError?: (error: Error, context?: string) => void;
  enableLogging?: boolean;
  fallbackValue?: any;
}

export interface UseErrorHandlerReturn {
  errorState: ComponentState<any>;
  handleError: (error: Error, context?: string) => void;
  resetError: () => void;
  retry: (callback?: () => void | Promise<void>) => void;
  safeExecute: <T>(fn: () => T | Promise<T>, context?: string) => Promise<T | any>;
  safeAsyncExecute: <T>(fn: () => Promise<T>, context?: string) => Promise<T | any>;
  canRetry: boolean;
  isRetrying: boolean;
}

// Utility types for safe components
export type SafeComponentType<P = {}> = React.ComponentType<P & SafeComponentProps>;

export type WithSafetyWrapper<P> = React.ComponentType<P> & {
  originalComponent: React.ComponentType<P>;
  displayName: string;
};

// Component-specific validation schemas
export const agentValidationSchema: ComponentValidationSchema<SafeAgent> = {
  required: ['id', 'name', 'status'],
  optional: ['display_name', 'description', 'capabilities', 'created_at', 'updated_at'],
  validators: {
    id: isString,
    name: isString,
    status: (value): value is SafeAgent['status'] => 
      ['active', 'inactive', 'error', 'testing'].includes(value as string)
  }
};

export const postValidationSchema: ComponentValidationSchema<SafePost> = {
  required: ['id', 'content'],
  optional: ['title', 'authorAgent', 'publishedAt', 'metadata', 'likes', 'comments'],
  validators: {
    id: isString,
    content: isString,
    likes: isNumber,
    comments: isNumber,
  }
};

export const activityValidationSchema: ComponentValidationSchema<SafeActivity> = {
  required: ['id'],
  optional: ['agentName', 'instance', 'type', 'description', 'timestamp', 'metadata'],
  validators: {
    id: isString,
    agentName: isString,
    instance: (value): value is 'development' | 'production' => 
      ['development', 'production'].includes(value as string)
  }
};

export default {
  isString,
  isNumber,
  isBoolean,
  isObject,
  isArray,
  isDefined,
  isValidDate,
  isValidUrl,
  isValidEmail,
  isValidAgent,
  isValidPost,
  isValidActivity,
  isValidApiResponse,
  validateComponentProps,
  safeParseInt,
  safeParseFloat,
  safeParseDate,
  safeParseArray,
  safeParseObject,
  agentValidationSchema,
  postValidationSchema,
  activityValidationSchema
};