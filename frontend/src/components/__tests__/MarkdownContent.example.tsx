/**
 * Example usage of MarkdownContent component
 *
 * This file demonstrates how to use the MarkdownContent component
 * with various features including @mentions, #hashtags, URLs, and markdown.
 */

import React from 'react';
import MarkdownContent from '../MarkdownContent';

/**
 * Basic example with plain text
 */
export const BasicExample = () => (
  <MarkdownContent content="Hello World! This is plain text." />
);

/**
 * Markdown formatting example
 */
export const MarkdownExample = () => (
  <MarkdownContent
    content={`
# Heading 1
## Heading 2

This is **bold** text and this is *italic* text.

Here's a \`code snippet\` and a [link](https://example.com).

- List item 1
- List item 2
- List item 3

> This is a blockquote

\`\`\`javascript
console.log("Hello, World!");
\`\`\`
    `.trim()}
  />
);

/**
 * Interactive elements example
 */
export const InteractiveExample = () => {
  const handleMentionClick = (agent: string) => {
    console.log('Clicked mention:', agent);
    alert(`Navigating to @${agent}'s profile`);
  };

  const handleHashtagClick = (tag: string) => {
    console.log('Clicked hashtag:', tag);
    alert(`Filtering by #${tag}`);
  };

  return (
    <MarkdownContent
      content="Hey @alice, check out the new #update! Also see @bob's post about #react."
      onMentionClick={handleMentionClick}
      onHashtagClick={handleHashtagClick}
      enableLinkPreviews={true}
    />
  );
};

/**
 * Complex example with mixed content
 */
export const ComplexExample = () => {
  return (
    <MarkdownContent
      content={`
# Project Update by @alice

Hey team! 👋

## New Features

We've shipped some amazing updates in #sprint42:

- **@bob** implemented the new authentication system
- **@carol** fixed the #performance issues
- **@dave** added dark mode support

Check out the details at https://github.com/team/project/pull/123

### Technical Details

Here's the implementation:

\`\`\`typescript
interface UserAuth {
  token: string;
  expiresAt: Date;
}
\`\`\`

## Next Steps

1. Code review by @eve
2. Deployment to #staging
3. Final testing

Questions? Ping @frank or check #support

| Metric | Before | After |
|--------|--------|-------|
| Load Time | 2.5s | 0.8s |
| Memory | 250MB | 120MB |

Great work everyone! 🚀
      `.trim()}
      onMentionClick={(agent) => console.log('Navigate to:', agent)}
      onHashtagClick={(tag) => console.log('Filter by:', tag)}
      enableLinkPreviews={true}
    />
  );
};

/**
 * Security example - dangerous content is sanitized
 */
export const SecurityExample = () => (
  <MarkdownContent
    content={`
# Security Test

This should be safe: <script>alert('xss')</script>

This link is blocked: [Bad Link](javascript:alert('xss'))

This is also blocked: [Data URL](data:text/html,<script>alert('xss')</script>)

But this is fine: https://example.com
    `.trim()}
  />
);

/**
 * Edge case example - empty or invalid content
 */
export const EdgeCaseExample = () => (
  <div>
    <h2>Empty Content</h2>
    <MarkdownContent content="" />

    <h2>Plain Text (No Markdown)</h2>
    <MarkdownContent content="Just plain text without any markdown" />

    <h2>Only Special Tokens</h2>
    <MarkdownContent content="@alice @bob #test #update" />

    <h2>Markdown Headers vs Hashtags</h2>
    <MarkdownContent
      content={`
# This is a heading (not a hashtag)

This is a #hashtag

## Another heading

And another #hashtag here
      `.trim()}
    />
  </div>
);

/**
 * Dark mode example (automatic based on system preference)
 */
export const DarkModeExample = () => (
  <div className="dark">
    <div className="bg-gray-900 p-8 rounded-lg">
      <MarkdownContent
        content={`
# Dark Mode Test

This content should render with dark mode colors.

- **Bold text** in dark mode
- *Italic text* in dark mode
- \`Code\` in dark mode

Check @alice's profile or browse #darkmode posts.

> This is a blockquote in dark mode
        `.trim()}
      />
    </div>
  </div>
);

/**
 * Example showing link extraction for previews
 */
export const LinkPreviewExample = () => {
  return (
    <MarkdownContent
      content={`
Check out these resources:

- Documentation: https://docs.example.com
- GitHub: https://github.com/example/repo
- Blog post: https://blog.example.com/post-title

@alice shared these at the #conference
      `.trim()}
      enableLinkPreviews={true}
      onMentionClick={(agent) => console.log('Mention:', agent)}
      onHashtagClick={(tag) => console.log('Hashtag:', tag)}
    />
  );
};

/**
 * Performance example with large content
 */
export const PerformanceExample = () => {
  const largeContent = Array.from({ length: 50 }, (_, i) => `
## Section ${i + 1}

This is paragraph ${i + 1} with @user${i} mentioning #topic${i}.

- Point 1 for section ${i + 1}
- Point 2 for section ${i + 1}
- Point 3 for section ${i + 1}

Check https://example.com/section${i + 1}
  `).join('\n\n');

  console.log('Large content length:', largeContent.length, 'characters');

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        Rendering {largeContent.length} characters with 50+ mentions and hashtags
      </p>
      <MarkdownContent
        content={largeContent}
        onMentionClick={(agent) => console.log('Clicked:', agent)}
        onHashtagClick={(tag) => console.log('Tag:', tag)}
      />
    </div>
  );
};

/**
 * Disabled markdown example (fallback to plain text with special tokens)
 */
export const DisabledMarkdownExample = () => (
  <MarkdownContent
    content="**This bold won't work** but @alice and #tags still work!"
    enableMarkdown={false}
    onMentionClick={(agent) => alert(`Clicked: ${agent}`)}
    onHashtagClick={(tag) => alert(`Tag: ${tag}`)}
  />
);
