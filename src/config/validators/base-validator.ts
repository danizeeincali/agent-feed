/**
 * Base Validator for Protected Agent Configuration
 *
 * This module provides a base validator class for validating agent configurations
 * using Zod schemas. It includes error formatting, validation result types, and
 * common validation patterns.
 *
 * Architecture: Hybrid Markdown + Protected Sidecar
 * Location: /workspaces/agent-feed/src/config/validators/base-validator.ts
 */

import { z, ZodError, ZodSchema } from 'zod';

/**
 * Validation Result
 * Standardized result format for all validations
 */
export interface ValidationResult<T = any> {
  /** Whether validation succeeded */
  success: boolean;

  /** Validated data (if successful) */
  data?: T;

  /** Validation errors (if failed) */
  errors?: ValidationError[];

  /** Human-readable error message */
  message?: string;

  /** Additional context */
  context?: Record<string, any>;
}

/**
 * Validation Error
 * Detailed error information for failed validations
 */
export interface ValidationError {
  /** Field path (e.g., "permissions.workspace.root") */
  path: string[];

  /** Error code (e.g., "invalid_type", "too_small") */
  code: string;

  /** Human-readable error message */
  message: string;

  /** Expected value or type */
  expected?: string;

  /** Received value or type */
  received?: string;
}

/**
 * Base Validator Class
 * Provides common validation functionality using Zod schemas
 */
export class BaseValidator<T = any> {
  protected schema: ZodSchema<T>;

  constructor(schema: ZodSchema<T>) {
    this.schema = schema;
  }

  /**
   * Validate data against schema
   * Throws error on validation failure
   */
  validate(data: unknown): T {
    try {
      return this.schema.parse(data);
    } catch (error) {
      if (error instanceof ZodError) {
        throw this.createValidationException(error);
      }
      throw error;
    }
  }

  /**
   * Safe validate: Returns result object instead of throwing
   */
  safeValidate(data: unknown): ValidationResult<T> {
    const result = this.schema.safeParse(data);

    if (result.success) {
      return {
        success: true,
        data: result.data,
      };
    } else {
      return {
        success: false,
        errors: this.formatZodErrors(result.error),
        message: this.createErrorMessage(result.error),
      };
    }
  }

  /**
   * Validate and return result with detailed errors
   */
  validateWithResult(data: unknown, context?: Record<string, any>): ValidationResult<T> {
    const result = this.safeValidate(data);

    if (context) {
      result.context = context;
    }

    return result;
  }

  /**
   * Validate partial data (subset of schema)
   * Note: Only works with z.object() schemas
   */
  validatePartial(data: unknown): Partial<T> {
    // TypeScript limitation: partial() only exists on ZodObject, not base ZodSchema
    const partialSchema = (this.schema as any).partial();
    return partialSchema.parse(data);
  }

  /**
   * Safe validate partial data
   * Note: Only works with z.object() schemas
   */
  safeValidatePartial(data: unknown): ValidationResult<Partial<T>> {
    // TypeScript limitation: partial() only exists on ZodObject, not base ZodSchema
    const partialSchema = (this.schema as any).partial();
    const result = partialSchema.safeParse(data);

    if (result.success) {
      return {
        success: true,
        data: result.data,
      };
    } else {
      return {
        success: false,
        errors: this.formatZodErrors(result.error),
        message: this.createErrorMessage(result.error),
      };
    }
  }

  /**
   * Format Zod errors into standardized ValidationError array
   */
  protected formatZodErrors(zodError: ZodError): ValidationError[] {
    const issues = zodError.issues || (zodError as any).errors || [];
    return issues.map((error: any) => ({
      path: error.path?.map(String) || [],
      code: error.code || 'unknown',
      message: error.message || 'Validation failed',
      expected: this.getExpectedValue(error),
      received: this.getReceivedValue(error),
    }));
  }

  /**
   * Create human-readable error message from Zod error
   */
  protected createErrorMessage(zodError: ZodError): string {
    const errors = zodError.issues || (zodError as any).errors || [];

    if (errors.length === 0) {
      return 'Validation failed';
    }

    if (errors.length === 1) {
      const error = errors[0];
      const path = error.path?.join('.') || '';
      return path ? `${path}: ${error.message}` : error.message;
    }

    return `Validation failed with ${errors.length} errors:\n${errors
      .map((e: any) => {
        const path = e.path?.join('.') || '';
        return path ? `  - ${path}: ${e.message}` : `  - ${e.message}`;
      })
      .join('\n')}`;
  }

  /**
   * Create validation exception with formatted errors
   */
  protected createValidationException(zodError: ZodError): Error {
    const message = this.createErrorMessage(zodError);
    const error = new Error(message);
    error.name = 'ValidationError';
    (error as any).validationErrors = this.formatZodErrors(zodError);
    return error;
  }

  /**
   * Get expected value from Zod error
   */
  protected getExpectedValue(error: any): string | undefined {
    const code = error.code;

    if (code === 'invalid_type' && error.expected) {
      return String(error.expected);
    }
    if (code === 'too_small' && error.minimum !== undefined) {
      return `>= ${error.minimum}`;
    }
    if (code === 'too_big' && error.maximum !== undefined) {
      return `<= ${error.maximum}`;
    }

    return undefined;
  }

  /**
   * Get received value from Zod error
   */
  protected getReceivedValue(error: z.ZodIssue): string | undefined {
    if ('received' in error) {
      return String(error.received);
    }
    return undefined;
  }

  /**
   * Check if data is valid (boolean check)
   */
  isValid(data: unknown): boolean {
    return this.schema.safeParse(data).success;
  }

  /**
   * Get validation errors without throwing
   */
  getErrors(data: unknown): ValidationError[] | null {
    const result = this.schema.safeParse(data);
    return result.success ? null : this.formatZodErrors(result.error);
  }
}

/**
 * Validation Exception Class
 * Custom error class for validation failures
 */
export class ValidationException extends Error {
  public readonly validationErrors: ValidationError[];
  public readonly context?: Record<string, any>;

  constructor(
    message: string,
    validationErrors: ValidationError[],
    context?: Record<string, any>
  ) {
    super(message);
    this.name = 'ValidationException';
    this.validationErrors = validationErrors;
    this.context = context;
  }

  /**
   * Get formatted error message with all validation errors
   */
  getDetailedMessage(): string {
    let message = this.message;

    if (this.validationErrors.length > 0) {
      message += '\n\nValidation Errors:\n';
      message += this.validationErrors
        .map((error) => {
          const path = error.path.join('.');
          const location = path ? `${path}: ` : '';
          return `  - ${location}${error.message}`;
        })
        .join('\n');
    }

    if (this.context) {
      message += '\n\nContext:\n';
      message += Object.entries(this.context)
        .map(([key, value]) => `  ${key}: ${JSON.stringify(value)}`)
        .join('\n');
    }

    return message;
  }

  /**
   * Convert to JSON for API responses
   */
  toJSON() {
    return {
      error: 'ValidationException',
      message: this.message,
      validationErrors: this.validationErrors,
      context: this.context,
    };
  }
}

/**
 * Helper: Create validator from Zod schema
 */
export function createValidator<T>(schema: ZodSchema<T>): BaseValidator<T> {
  return new BaseValidator<T>(schema);
}

/**
 * Helper: Validate with custom error message
 */
export function validateWithMessage<T>(
  schema: ZodSchema<T>,
  data: unknown,
  customMessage?: string
): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof ZodError) {
      const validator = new BaseValidator(schema);
      const formattedErrors = validator['formatZodErrors'](error);
      throw new ValidationException(
        customMessage || validator['createErrorMessage'](error),
        formattedErrors
      );
    }
    throw error;
  }
}

/**
 * Example Usage:
 *
 * ```typescript
 * import { z } from 'zod';
 * import { BaseValidator } from './base-validator';
 *
 * const UserSchema = z.object({
 *   name: z.string(),
 *   email: z.string().email(),
 *   age: z.number().min(18),
 * });
 *
 * const validator = new BaseValidator(UserSchema);
 *
 * // Throw on error
 * const user = validator.validate({ name: 'John', email: 'john@example.com', age: 25 });
 *
 * // Return result object
 * const result = validator.safeValidate({ name: 'John', email: 'invalid', age: 15 });
 * if (!result.success) {
 *   console.log(result.errors);
 * }
 *
 * // Boolean check
 * if (validator.isValid(data)) {
 *   // data is valid
 * }
 * ```
 */

export default BaseValidator;
