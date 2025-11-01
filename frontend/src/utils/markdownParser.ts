/**
 * Markdown Parser Utilities
 *
 * Provides functions to extract and restore special tokens (@mentions, #hashtags, URLs)
 * from markdown content, ensuring they remain interactive after markdown processing.
 *
 * @module utils/markdownParser
 */

import { MARKDOWN_PATTERNS, hasMarkdownSyntax } from './markdownConstants';

/**
 * Special token representing a mention, hashtag, or URL
 */
export interface SpecialToken {
  id: string;
  type: 'mention' | 'hashtag' | 'url';
  originalContent: string;
  placeholder: string;
  data: {
    agent?: string;
    tag?: string;
    url?: string;
  };
  position: number;
  length: number;
}

/**
 * Result of extracting special tokens from content
 */
export interface TokenExtractionResult {
  processedContent: string;
  tokenMap: Map<string, SpecialToken>;
  linkPreviews: string[];
  hasMarkdown: boolean;
  hasSpecialTokens: boolean;
}

/**
 * Configuration for token extraction
 */
export interface TokenExtractionConfig {
  extractMentions?: boolean;
  extractHashtags?: boolean;
  extractUrls?: boolean;
  preserveMarkdownHeaders?: boolean;
}

// Regex patterns for special tokens
const MENTION_PATTERN = /@([a-zA-Z0-9_-]+)/g;
const HASHTAG_PATTERN = /#([a-zA-Z0-9_-]+)/g;
const URL_PATTERN = /(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/g;

// Placeholder prefixes
const PLACEHOLDER_PREFIX_MENTION = '___MENTION_';
const PLACEHOLDER_PREFIX_HASHTAG = '___HASHTAG_';
const PLACEHOLDER_PREFIX_URL = '___URL_';
const PLACEHOLDER_SUFFIX = '___';

// Markdown detection patterns imported from markdownConstants.ts
// This ensures 1:1 parity with contentParser.tsx detection logic

/**
 * Extracts special tokens from content and replaces them with safe placeholders.
 *
 * This function processes content in three phases:
 * 1. Extract URLs (longest matches first to prevent conflicts)
 * 2. Extract @mentions (excluding those inside URL placeholders)
 * 3. Extract #hashtags (excluding those inside placeholders and markdown headers)
 *
 * @param content - The raw content string
 * @param config - Configuration options for extraction
 * @returns Extraction result with processed content and token mappings
 *
 * @example
 * ```typescript
 * const result = extractSpecialTokens("Check @alice's post #update at https://example.com");
 * // result.processedContent: "Check ___MENTION_0___'s post ___HASHTAG_0___ at ___URL_0___"
 * // result.tokenMap.size: 3
 * ```
 */
export function extractSpecialTokens(
  content: string,
  config: TokenExtractionConfig = {}
): TokenExtractionResult {
  const {
    extractMentions = true,
    extractHashtags = true,
    extractUrls = true,
    preserveMarkdownHeaders = true
  } = config;

  const tokenMap = new Map<string, SpecialToken>();
  const linkPreviews: string[] = [];
  let processedContent = content;

  let mentionCounter = 0;
  let hashtagCounter = 0;
  let urlCounter = 0;

  // Phase 1: Extract URLs first (to prevent @ in URLs being treated as mentions)
  if (extractUrls) {
    const urlMatches = findAllMatches(content, URL_PATTERN);
    // Assign IDs based on document order (ascending position)
    const sortedForIds = [...urlMatches].sort((a, b) => a.position - b.position);
    const urlIdMap = new Map<number, number>();
    sortedForIds.forEach((match, index) => {
      urlIdMap.set(match.position, index);
    });

    // Sort by position descending for safe replacement (replace from end to start)
    urlMatches.sort((a, b) => b.position - a.position);

    for (const match of urlMatches) {
      const urlText = match.fullMatch;
      const startPos = match.position;
      const endPos = startPos + urlText.length;

      // Use position-based ID to maintain document order
      const urlId = urlIdMap.get(startPos) ?? urlCounter++;
      const placeholderId = `${PLACEHOLDER_PREFIX_URL}${urlId}${PLACEHOLDER_SUFFIX}`;

      const token: SpecialToken = {
        id: placeholderId,
        type: 'url',
        originalContent: urlText,
        placeholder: placeholderId,
        data: { url: urlText },
        position: startPos,
        length: urlText.length
      };

      tokenMap.set(placeholderId, token);

      // Track unique URLs for link previews
      if (!linkPreviews.includes(urlText)) {
        linkPreviews.push(urlText);
      }

      // Replace in content
      processedContent = replaceRange(processedContent, startPos, endPos, placeholderId);
    }
  }

  // Phase 2: Extract @mentions
  if (extractMentions) {
    const mentionMatches = findAllMatches(processedContent, MENTION_PATTERN);
    mentionMatches.sort((a, b) => b.position - a.position);

    for (const match of mentionMatches) {
      const mentionText = match.fullMatch;
      const username = match.groups[1];
      const startPos = match.position;
      const endPos = startPos + mentionText.length;

      // Skip if inside existing placeholder
      if (isInsidePlaceholder(processedContent, startPos, tokenMap)) {
        continue;
      }

      const placeholderId = `${PLACEHOLDER_PREFIX_MENTION}${mentionCounter}${PLACEHOLDER_SUFFIX}`;
      mentionCounter++;

      const token: SpecialToken = {
        id: placeholderId,
        type: 'mention',
        originalContent: mentionText,
        placeholder: placeholderId,
        data: { agent: username },
        position: startPos,
        length: mentionText.length
      };

      tokenMap.set(placeholderId, token);
      processedContent = replaceRange(processedContent, startPos, endPos, placeholderId);
    }
  }

  // Phase 3: Extract #hashtags
  if (extractHashtags) {
    const hashtagMatches = findAllMatches(processedContent, HASHTAG_PATTERN);
    hashtagMatches.sort((a, b) => b.position - a.position);

    for (const match of hashtagMatches) {
      const hashtagText = match.fullMatch;
      const tagName = match.groups[1];
      const startPos = match.position;
      const endPos = startPos + hashtagText.length;

      // Skip if inside existing placeholder
      if (isInsidePlaceholder(processedContent, startPos, tokenMap)) {
        continue;
      }

      // Skip markdown headers (# at start of line)
      if (preserveMarkdownHeaders && isMarkdownHeader(processedContent, startPos)) {
        continue;
      }

      const placeholderId = `${PLACEHOLDER_PREFIX_HASHTAG}${hashtagCounter}${PLACEHOLDER_SUFFIX}`;
      hashtagCounter++;

      const token: SpecialToken = {
        id: placeholderId,
        type: 'hashtag',
        originalContent: hashtagText,
        placeholder: placeholderId,
        data: { tag: tagName },
        position: startPos,
        length: hashtagText.length
      };

      tokenMap.set(placeholderId, token);
      processedContent = replaceRange(processedContent, startPos, endPos, placeholderId);
    }
  }

  // Analyze content characteristics
  const hasMarkdown = detectMarkdownSyntax(processedContent);
  const hasSpecialTokens = tokenMap.size > 0;

  return {
    processedContent,
    tokenMap,
    linkPreviews,
    hasMarkdown,
    hasSpecialTokens
  };
}

/**
 * Restores special tokens from placeholders in processed content.
 *
 * This function is typically used in custom markdown renderers to convert
 * placeholders back to their original tokens.
 *
 * @param content - Content containing placeholders
 * @param tokenMap - Map of placeholder IDs to token data
 * @returns Content with placeholders restored to original tokens
 *
 * @example
 * ```typescript
 * const restored = restoreSpecialTokens(
 *   "Check ___MENTION_0___ at ___URL_0___",
 *   tokenMap
 * );
 * // restored: "Check @alice at https://example.com"
 * ```
 */
export function restoreSpecialTokens(
  content: string,
  tokenMap: Map<string, SpecialToken>
): string {
  let result = content;

  // Find all placeholders and replace with original content
  for (const [placeholderId, token] of tokenMap) {
    result = result.replace(new RegExp(placeholderId, 'g'), token.originalContent);
  }

  return result;
}

/**
 * Sanitizes markdown content by removing dangerous patterns.
 *
 * This is a pre-processing step before markdown rendering. The actual
 * sanitization is performed by rehype-sanitize during rendering.
 *
 * @param content - Raw markdown content
 * @returns Sanitized content with dangerous patterns removed
 *
 * @example
 * ```typescript
 * const safe = sanitizeMarkdown('<script>alert("xss")</script>Hello');
 * // safe: "Hello"
 * ```
 */
export function sanitizeMarkdown(content: string): string {
  if (!content) return '';

  let sanitized = content;

  // Remove script tags
  sanitized = sanitized.replace(/<script[^>]*>.*?<\/script>/gi, '');

  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, '');

  // Remove data: protocol (optional, can be configurable)
  sanitized = sanitized.replace(/data:text\/html/gi, '');

  // Remove event handlers
  sanitized = sanitized.replace(/on\w+\s*=/gi, '');

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  return sanitized;
}

/**
 * Detects if content contains markdown syntax.
 *
 * Uses centralized pattern definitions from markdownConstants.ts
 * to ensure consistency with contentParser.tsx detection logic.
 *
 * @param content - Content to analyze
 * @returns True if markdown syntax is detected
 *
 * @see {@link markdownConstants.hasMarkdownSyntax} for the underlying implementation
 * @see {@link markdownConstants.MARKDOWN_PATTERNS} for the pattern definitions
 */
export function detectMarkdownSyntax(content: string): boolean {
  return hasMarkdownSyntax(content);
}

// Helper Functions

/**
 * Finds all matches of a regex pattern in text.
 */
interface Match {
  fullMatch: string;
  groups: RegExpExecArray;
  position: number;
  length: number;
}

function findAllMatches(text: string, pattern: RegExp): Match[] {
  const matches: Match[] = [];
  const regex = new RegExp(pattern.source, pattern.flags);

  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    matches.push({
      fullMatch: match[0],
      groups: match,
      position: match.index,
      length: match[0].length
    });

    // Prevent infinite loop on zero-width matches
    if (match.index === regex.lastIndex) {
      regex.lastIndex++;
    }
  }

  return matches;
}

/**
 * Checks if a position in content falls within an existing placeholder.
 */
function isInsidePlaceholder(
  content: string,
  position: number,
  tokenMap: Map<string, SpecialToken>
): boolean {
  for (const [placeholderId] of tokenMap) {
    const placeholderPos = content.indexOf(placeholderId);

    if (placeholderPos !== -1) {
      const placeholderEnd = placeholderPos + placeholderId.length;

      if (position >= placeholderPos && position < placeholderEnd) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Checks if a # character is at the start of a line (markdown header).
 */
function isMarkdownHeader(content: string, hashPosition: number): boolean {
  // Check if # is at start of content
  if (hashPosition === 0) {
    return true;
  }

  // Check if # is after a newline
  const charBefore = content[hashPosition - 1];
  if (charBefore === '\n') {
    return true;
  }

  return false;
}

/**
 * Replaces a range in a string with new content.
 */
function replaceRange(
  str: string,
  start: number,
  end: number,
  replacement: string
): string {
  return str.slice(0, start) + replacement + str.slice(end);
}
