/**
 * Generates a URL-friendly slug from a given name string
 *
 * @param name - The input string to convert to a slug
 * @returns A lowercase, hyphen-separated slug string
 *
 * @example
 * generateSlug('Chief of Staff') // returns 'chief-of-staff'
 * generateSlug('Data Analyzer 2.0') // returns 'data-analyzer-2-0'
 * generateSlug('Test@Agent#123') // returns 'test-agent-123'
 */
export function generateSlug(name: string): string {
  if (!name || typeof name !== 'string') {
    return '';
  }

  return name
    .toLowerCase() // Convert to lowercase
    .trim() // Remove leading/trailing whitespace
    .replace(/[^a-z0-9\s-_]/g, '-') // Replace special chars with hyphens (keep alphanumeric, spaces, hyphens, underscores)
    .replace(/[\s_]+/g, '-') // Replace spaces and underscores with single hyphen
    .replace(/-+/g, '-') // Replace consecutive hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading and trailing hyphens
}
