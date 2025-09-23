/**
 * Simple class name utility function
 * Concatenates class names and removes falsy values
 */
export function cn(...classes: (string | undefined | null | boolean)[]): string {
  return classes.filter(Boolean).join(' ');
}