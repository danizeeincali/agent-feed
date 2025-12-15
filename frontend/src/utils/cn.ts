import { clsx } from 'clsx';

/**
 * Class name utility function using clsx
 * Concatenates class names and removes falsy values
 */
export function cn(...classes: (string | undefined | null | boolean)[]): string {
  return clsx(...classes);
}