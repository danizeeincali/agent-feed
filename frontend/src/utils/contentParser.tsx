import React from 'react';
import LinkPreview from '../components/LinkPreview';
import EnhancedLinkPreview from '../components/EnhancedLinkPreview';
import { MarkdownContent } from '../components/MarkdownContent';

export interface ParsedContent {
  type: 'text' | 'mention' | 'hashtag' | 'url' | 'link-preview';
  content: string;
  data?: {
    agent?: string;
    tag?: string;
    url?: string;
  };
}

export interface ContentParserOptions {
  onMentionClick?: (agent: string) => void;
  onHashtagClick?: (tag: string) => void;
  enableLinkPreviews?: boolean;
  useEnhancedPreviews?: boolean;
  previewDisplayMode?: 'card' | 'thumbnail' | 'inline' | 'embedded' | 'thumbnail-summary';
  showThumbnailsOnly?: boolean;
  className?: string;
  enableMarkdown?: boolean; // NEW: Feature flag for markdown rendering (default: true)
}

export const parseContent = (content: string): ParsedContent[] => {
  const parts: ParsedContent[] = [];
  
  // Clean parsing of content with URLs
  
  // Create fresh regex instances for each parse to avoid global state issues
  const createPatterns = () => ({
    mention: /@([a-zA-Z0-9_-]+)/g,
    hashtag: /#([a-zA-Z0-9_-]+)/g,
    // Fixed URL regex to properly capture complete URLs including query params and fragments
    url: /(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/g
  });

  let lastIndex = 0;
  const matches: Array<{ type: string; match: RegExpExecArray; index: number }> = [];

  // Find all matches with fresh regex instances
  const patterns = createPatterns();
  for (const [type, regex] of Object.entries(patterns)) {
    let match;
    while ((match = regex.exec(content)) !== null) {
      matches.push({ type, match, index: match.index });
      
      // Track URL matches for debugging if needed
      if (type === 'url' && process.env.NODE_ENV === 'development') {
        console.log('🔗 URL match found:', match[0], 'at index:', match.index);
      }
      
      // Prevent infinite loop for zero-width matches
      if (match.index === regex.lastIndex) {
        regex.lastIndex++;
      }
    }
  }

  // Sort matches by position
  matches.sort((a, b) => a.index - b.index);

  // Process matches
  for (const { type, match, index } of matches) {
    // Add text before match
    if (index > lastIndex) {
      const textContent = content.slice(lastIndex, index);
      if (textContent.trim()) {
        parts.push({ type: 'text', content: textContent });
      }
    }

    // Add the match
    switch (type) {
      case 'mention':
        parts.push({
          type: 'mention',
          content: match[0],
          data: { agent: match[1] }
        });
        break;
      case 'hashtag':
        parts.push({
          type: 'hashtag',
          content: match[0],
          data: { tag: match[1] }
        });
        break;
      case 'url':
        parts.push({
          type: 'url',
          content: match[0],
          data: { url: match[0] }
        });
        break;
    }

    lastIndex = index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    const remainingContent = content.slice(lastIndex);
    if (remainingContent.trim()) {
      parts.push({ type: 'text', content: remainingContent });
    }
  }

  // If no special content found, return the entire text
  if (parts.length === 0) {
    parts.push({ type: 'text', content });
  }

  return parts;
};

/**
 * Render content with markdown support
 *
 * Strategy:
 * 1. Check if content has markdown syntax AND markdown is enabled
 * 2. If YES: Use MarkdownContent component (preserves @mentions, #hashtags, URLs)
 * 3. If NO: Use existing parseContent/renderParsedContent flow
 *
 * This maintains backward compatibility while adding markdown support.
 */
export const renderParsedContent = (
  parsedContent: ParsedContent[],
  options: ContentParserOptions = {}
): JSX.Element => {
  const {
    onMentionClick,
    onHashtagClick,
    enableLinkPreviews = true,
    useEnhancedPreviews = true,
    previewDisplayMode = 'card',
    showThumbnailsOnly = false,
    className = '',
    enableMarkdown = true // Default: markdown enabled
  } = options;

  // Reconstruct original content from parsed parts
  const originalContent = parsedContent.map(part => part.content).join('');

  // Check if we should use markdown rendering
  // Conditions: markdown enabled AND content has markdown syntax
  if (enableMarkdown && hasMarkdown(originalContent)) {
    // Extract URLs for link previews (from parsed content)
    const urlParts = parsedContent.filter(part => part.type === 'url');
    const urls = urlParts.map(part => part.data?.url || part.content);

    return (
      <div className={className}>
        {/* Render markdown content with custom styling */}
        <div className="mb-4">
          <MarkdownContent content={originalContent} />
        </div>

        {/* Render link previews separately (below markdown content) */}
        {enableLinkPreviews && urls.length > 0 && (
          <div className="space-y-3">
            {urls.map((url, index) => {
              return useEnhancedPreviews ? (
                <EnhancedLinkPreview
                  key={index}
                  url={url}
                  displayMode={previewDisplayMode}
                  showThumbnailOnly={showThumbnailsOnly}
                />
              ) : (
                <LinkPreview key={index} url={url} />
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Fallback to existing non-markdown rendering
  // This preserves backward compatibility for plain text posts

  const linkPreviews: string[] = [];

  const elements = parsedContent.map((part, index) => {
    switch (part.type) {
      case 'mention':
        return (
          <button
            key={index}
            onClick={() => onMentionClick?.(part.data?.agent || '')}
            className="text-blue-600 hover:text-blue-800 hover:underline font-medium bg-blue-50 px-2 py-1 rounded-md transition-colors cursor-pointer"
            title={`View posts by ${part.data?.agent}`}
          >
            {part.content}
          </button>
        );

      case 'hashtag':
        return (
          <button
            key={index}
            onClick={() => onHashtagClick?.(part.data?.tag || '')}
            className="text-purple-600 hover:text-purple-800 hover:underline font-medium bg-purple-50 px-2 py-1 rounded-md transition-colors cursor-pointer"
            title={`View posts with ${part.content}`}
          >
            {part.content}
          </button>
        );

      case 'url':
        const url = part.data?.url || part.content;
        
        // Track URL processing for debugging if needed
        if (process.env.NODE_ENV === 'development' && (url.includes('youtube.com') || url.includes('wired.com'))) {
          console.log('🔗 Processing URL for preview:', url);
        }
        
        if (enableLinkPreviews && !linkPreviews.includes(url)) {
          linkPreviews.push(url);
        }
        return (
          <a
            key={index}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 hover:underline break-all"
          >
            {part.content}
          </a>
        );

      default:
        return (
          <span key={index} className="whitespace-pre-wrap">
            {part.content}
          </span>
        );
    }
  });

  return (
    <div className={className}>
      <div className="mb-4">{elements}</div>
      
      {enableLinkPreviews && linkPreviews.length > 0 && (
        <div className="space-y-3">
          {linkPreviews.map((url, index) => {
            // Track link preview rendering for debugging if needed
            if (process.env.NODE_ENV === 'development') {
              console.log('🎬 Rendering link preview for URL:', url, 'Mode:', previewDisplayMode);
            }
            
            return useEnhancedPreviews ? (
              <EnhancedLinkPreview 
                key={index} 
                url={url} 
                displayMode={previewDisplayMode}
                showThumbnailOnly={showThumbnailsOnly}
              />
            ) : (
              <LinkPreview key={index} url={url} />
            );
          })}
        </div>
      )}
    </div>
  );
};

export const extractMentions = (content: string): string[] => {
  const mentions: string[] = [];
  const mentionRegex = /@([a-zA-Z0-9_-]+)/g;
  let match;
  
  while ((match = mentionRegex.exec(content)) !== null) {
    if (!mentions.includes(match[1])) {
      mentions.push(match[1]);
    }
  }
  
  return mentions;
};

export const extractHashtags = (content: string): string[] => {
  const hashtags: string[] = [];
  const hashtagRegex = /#([a-zA-Z0-9_-]+)/g;
  let match;
  
  while ((match = hashtagRegex.exec(content)) !== null) {
    if (!hashtags.includes(match[1])) {
      hashtags.push(match[1]);
    }
  }
  
  return hashtags;
};

export const extractUrls = (content: string): string[] => {
  const urls: string[] = [];
  // Create fresh URL regex instance to avoid global state issues
  const urlRegex = new RegExp('(https?:\\/\\/[^\\s<>"{}|\\\\^`\\[\\]]+)', 'g');
  let match;
  
  while ((match = urlRegex.exec(content)) !== null) {
    const url = match[0];
    // Clean up common trailing punctuation
    const cleanUrl = url.replace(/[.,;!?]+$/, '');
    if (!urls.includes(cleanUrl)) {
      urls.push(cleanUrl);
    }
    // Prevent infinite loop for zero-width matches
    if (match.index === urlRegex.lastIndex) {
      urlRegex.lastIndex++;
    }
  }
  
  return urls;
};

export const hasSpecialContent = (content: string): boolean => {
  // Create fresh regex instances to avoid global state issues
  const mentionRegex = new RegExp('@([a-zA-Z0-9_-]+)');
  const hashtagRegex = new RegExp('#([a-zA-Z0-9_-]+)');
  const urlRegex = new RegExp('(https?:\\/\\/[^\\s<>"{}|\\\\^`\\[\\]]+)');

  return mentionRegex.test(content) || hashtagRegex.test(content) || urlRegex.test(content);
};

/**
 * Detect if content contains markdown syntax
 *
 * Checks for common markdown patterns:
 * - Headers (# ## ### etc)
 * - Bold (**text**)
 * - Italic (*text* or _text_)
 * - Code (`code` or ```code```)
 * - Lists (- item or 1. item)
 * - Blockquotes (> text)
 * - Links ([text](url))
 */
export const hasMarkdown = (content: string): boolean => {
  const markdownPatterns = [
    /\*\*[^*]+\*\*/,           // Bold
    /\*[^*\s][^*]*\*/,         // Italic (not empty)
    /`[^`]+`/,                 // Inline code
    /^#{1,6}\s/m,              // Headers
    /^\s*[-*+]\s/m,            // Unordered lists
    /^\s*\d+\.\s/m,            // Ordered lists
    /^>\s/m,                   // Blockquotes
    /\[([^\]]+)\]\(([^)]+)\)/, // Links
    /```[\s\S]*?```/,          // Code blocks
    /^---+$/m,                 // Horizontal rules
    /~~[^~]+~~/,               // Strikethrough (GFM)
  ];

  return markdownPatterns.some(pattern => pattern.test(content));
};