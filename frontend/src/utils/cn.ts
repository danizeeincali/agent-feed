/**
 * TDD London School: CN Utility Mock Implementation
 * 
 * Provides className concatenation utility used throughout the app.
 * This replaces clsx/class-variance-authority functionality.
 */

type ClassValue = string | number | boolean | undefined | null;
type ClassArray = ClassValue[];
type ClassDictionary = Record<string, any>;
type ClassNameValue = ClassValue | ClassArray | ClassDictionary;

/**
 * A simple className utility that concatenates and filters class names
 * Compatible with clsx and class-variance-authority patterns
 */
export function cn(...inputs: ClassNameValue[]): string {
  const classes: string[] = [];
  
  for (const input of inputs) {
    if (!input) continue;
    
    if (typeof input === 'string' || typeof input === 'number') {
      classes.push(String(input));
    } else if (Array.isArray(input)) {
      const nestedResult = cn(...input);
      if (nestedResult) classes.push(nestedResult);
    } else if (typeof input === 'object') {
      for (const key in input) {
        if (input[key]) classes.push(key);
      }
    }
  }
  
  return classes.join(' ');
}

/**
 * Class Variance Authority (CVA) mock implementation
 * Provides basic variant support for component styling
 */
export interface VariantProps {
  variants?: Record<string, Record<string, string>>;
  defaultVariants?: Record<string, string>;
}

export function cva(base: string, config?: VariantProps) {
  return (options?: Record<string, string | undefined>) => {
    let result = base;
    
    if (!config?.variants || !options) return result;
    
    for (const [variantKey, variantValue] of Object.entries(options)) {
      if (variantValue && config.variants[variantKey]?.[variantValue]) {
        result = cn(result, config.variants[variantKey][variantValue]);
      }
    }
    
    return result;
  };
}

export default cn;

// Additional utility functions that might be used
export const clsx = cn;
export const classNames = cn;

/**
 * Common utility for conditional classes
 */
export function conditionalClass(
  condition: boolean,
  trueClass: string,
  falseClass: string = ''
): string {
  return condition ? trueClass : falseClass;
}

/**
 * Merge multiple class name sources with priority
 */
export function mergeClasses(...sources: (string | undefined)[]): string {
  return cn(...sources);
}