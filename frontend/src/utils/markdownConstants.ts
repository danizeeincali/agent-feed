/**
 * Centralized Markdown Pattern Detection
 *
 * Single source of truth for all markdown syntax patterns.
 * Used by both contentParser.tsx and markdownParser.ts to ensure
 * consistent markdown detection across the application.
 *
 * @module markdownConstants
 * @since 2.0.0
 */

/**
 * Comprehensive markdown syntax patterns.
 *
 * Pattern order is optimized for common cases first:
 * 1. Inline formatting (bold, italic, code)
 * 2. Block elements (code blocks, headers, lists)
 * 3. Links and special elements (links, rules, strikethrough)
 *
 * All patterns are immutable and compiled once at module load time
 * for optimal performance.
 */
export const MARKDOWN_PATTERNS: ReadonlyArray<RegExp> = [
  /\*\*[^*]+\*\*/,           // Bold: **text**
  /\*[^*\s][^*]*\*/,         // Italic: *text* (strict - no empty space)
  /`[^`]+`/,                 // Inline code: `code`
  /```[\s\S]*?```/,          // Code blocks: ```code```
  /^#{1,6}\s/m,              // Headers: # H1 through ###### H6
  /^\s*[-*+]\s/m,            // Unordered lists: -, *, +
  /^\s*\d+\.\s/m,            // Ordered lists: 1. 2. 3.
  /^>\s/m,                   // Blockquotes: > quote
  /\[([^\]]+)\]\(([^)]+)\)/, // Links: [text](url)
  /^---+$/m,                 // Horizontal rules: ---
  /~~[^~]+~~/,               // Strikethrough: ~~text~~ (GFM)
] as const;

/**
 * Primary markdown detection function.
 *
 * Detects if content contains any markdown syntax by testing against
 * all defined patterns. Uses early-return optimization - stops at first match.
 *
 * Performance characteristics:
 * - Best case: O(1) - first pattern matches
 * - Worst case: O(n) - all patterns tested
 * - Typical: < 1ms for 500-character content
 *
 * @param content - Text content to analyze
 * @returns true if markdown syntax detected, false otherwise
 *
 * @example
 * ```typescript
 * hasMarkdownSyntax('**bold text**')  // true
 * hasMarkdownSyntax('plain text')     // false
 * hasMarkdownSyntax('')               // false
 * hasMarkdownSyntax(null)             // false (type-safe)
 * ```
 */
export function hasMarkdownSyntax(content: string): boolean {
  // Type guard and early return for invalid input
  if (!content || typeof content !== 'string') {
    return false;
  }

  // Test each pattern sequentially (early return on match)
  for (const pattern of MARKDOWN_PATTERNS) {
    if (pattern.test(content)) {
      return true;
    }
  }

  return false;
}
