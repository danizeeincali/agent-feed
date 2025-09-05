import React from 'react';
import LinkPreview from '../components/LinkPreview';

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
  className?: string;
}

export const parseContent = (content: string): ParsedContent[] => {
  const parts: ParsedContent[] = [];
  const patterns = {
    mention: /@([a-zA-Z0-9_-]+)/g,
    hashtag: /#([a-zA-Z0-9_-]+)/g,
    url: /(https?:\/\/[^\s]+)/g
  };

  let lastIndex = 0;
  const matches: Array<{ type: string; match: RegExpExecArray; index: number }> = [];

  // Find all matches
  for (const [type, regex] of Object.entries(patterns)) {
    let match;
    while ((match = regex.exec(content)) !== null) {
      matches.push({ type, match, index: match.index });
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

export const renderParsedContent = (
  parsedContent: ParsedContent[],
  options: ContentParserOptions = {}
): JSX.Element => {
  const {
    onMentionClick,
    onHashtagClick,
    enableLinkPreviews = true,
    className = ''
  } = options;

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
          {linkPreviews.map((url, index) => (
            <LinkPreview key={index} url={url} />
          ))}
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
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  let match;
  
  while ((match = urlRegex.exec(content)) !== null) {
    if (!urls.includes(match[0])) {
      urls.push(match[0]);
    }
  }
  
  return urls;
};

export const hasSpecialContent = (content: string): boolean => {
  const mentionRegex = /@([a-zA-Z0-9_-]+)/;
  const hashtagRegex = /#([a-zA-Z0-9_-]+)/;
  const urlRegex = /(https?:\/\/[^\s]+)/;
  
  return mentionRegex.test(content) || hashtagRegex.test(content) || urlRegex.test(content);
};