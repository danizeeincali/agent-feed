import React, { memo } from 'react';
import { ExternalLink } from 'lucide-react';

/**
 * LinkRenderer Component
 *
 * Secure link rendering for markdown content with:
 * - External link indicators and target="_blank"
 * - Protocol validation (blocks javascript:, data:, file:, vbscript:)
 * - Safe protocols (http:, https:, mailto:, tel:)
 * - rel="noopener noreferrer" for security
 * - Accessibility (ARIA labels, keyboard navigation)
 * - URL validation
 *
 * SPARC SPEC: 5-layer security for XSS prevention
 */

interface LinkRendererProps {
  href?: string;
  children?: React.ReactNode;
  title?: string;
  className?: string;
}

// SPARC SECURITY: Allowed protocols for links
const ALLOWED_PROTOCOLS = ['http:', 'https:', 'mailto:', 'tel:'];
const BLOCKED_PROTOCOLS = ['javascript:', 'vbscript:', 'data:', 'file:'];

/**
 * Validates if a URL is safe to use
 * @param url - URL string to validate
 * @returns true if URL is safe, false otherwise
 */
const isUrlSafe = (url: string): boolean => {
  if (!url || typeof url !== 'string') return false;

  const trimmedUrl = url.trim().toLowerCase();

  // Block dangerous protocols
  for (const protocol of BLOCKED_PROTOCOLS) {
    if (trimmedUrl.startsWith(protocol)) {
      console.warn(`🔒 Blocked dangerous protocol: ${protocol}`);
      return false;
    }
  }

  // Allow relative URLs (starting with / or # or .)
  if (trimmedUrl.startsWith('/') || trimmedUrl.startsWith('#') || trimmedUrl.startsWith('.')) {
    return true;
  }

  // Validate absolute URLs have allowed protocols
  try {
    const urlObj = new URL(url);
    const isAllowed = ALLOWED_PROTOCOLS.includes(urlObj.protocol);

    if (!isAllowed) {
      console.warn(`🔒 Blocked non-allowed protocol: ${urlObj.protocol}`);
    }

    return isAllowed;
  } catch (error) {
    // If URL parsing fails, it's not a valid URL
    console.warn('🔒 Invalid URL format:', url);
    return false;
  }
};

/**
 * Determines if URL is external (not relative or same-origin)
 * @param url - URL string to check
 * @returns true if external, false if internal/relative
 */
const isExternalUrl = (url: string): boolean => {
  if (!url) return false;

  const trimmedUrl = url.trim();

  // Relative URLs are not external
  if (trimmedUrl.startsWith('/') || trimmedUrl.startsWith('#') || trimmedUrl.startsWith('.')) {
    return false;
  }

  // Special protocols are considered external
  if (trimmedUrl.startsWith('mailto:') || trimmedUrl.startsWith('tel:')) {
    return false; // Don't show external indicator for these
  }

  try {
    const urlObj = new URL(url);
    // If we can parse it as absolute URL with http/https, it's external
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    // If parsing fails, assume not external (likely malformed)
    return false;
  }
};

const LinkRenderer: React.FC<LinkRendererProps> = memo(({
  href,
  children,
  title,
  className = ''
}) => {
  // SPARC SECURITY: Validate URL safety
  if (!href || !isUrlSafe(href)) {
    // Render as plain text if URL is unsafe
    return (
      <span
        className={`text-gray-700 ${className}`}
        title={title}
      >
        {children}
      </span>
    );
  }

  const isExternal = isExternalUrl(href);

  // SPARC SECURITY: External links get security attributes
  const externalProps = isExternal ? {
    target: '_blank',
    rel: 'noopener noreferrer',
  } : {};

  return (
    <a
      href={href}
      title={title}
      className={`text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-1 ${className}`}
      aria-label={isExternal ? `${children} (opens in new tab)` : undefined}
      {...externalProps}
    >
      {children}
      {isExternal && (
        <ExternalLink
          className="w-3 h-3 inline-block"
          aria-hidden="true"
        />
      )}
    </a>
  );
});

LinkRenderer.displayName = 'LinkRenderer';

export default LinkRenderer;
export { isUrlSafe, isExternalUrl };
