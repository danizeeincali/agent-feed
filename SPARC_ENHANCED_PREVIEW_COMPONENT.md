# SPARC Architecture: Enhanced Message Preview Component

## Project Overview
Design and implement an enhanced preview component for the Token Analytics Dashboard that provides rich markdown rendering, syntax highlighting, expandable/collapsible views, and performance optimization for large content.

**Date:** 2025-10-01
**Author:** SPARC Methodology Orchestrator
**Status:** Architecture Design Phase

---

## Phase 1: SPECIFICATION

### 1.1 Component Requirements

#### Functional Requirements

1. **Content Display**
   - Display both input and response content from TokenUsageRecord
   - Show preview mode by default (configurable preview length)
   - Support full content expansion on demand
   - Handle empty/null content gracefully

2. **Markdown Rendering**
   - Parse and render markdown in response content
   - Support GitHub Flavored Markdown (GFM)
   - Render lists, tables, blockquotes, emphasis
   - Support inline code and code blocks

3. **Syntax Highlighting**
   - Detect language in code blocks automatically
   - Apply syntax highlighting using react-syntax-highlighter
   - Support 100+ programming languages
   - Use theme consistent with dashboard design

4. **Expandable/Collapsible**
   - Clickable expand/collapse controls
   - Smooth transition animations
   - Keyboard accessibility (Enter/Space)
   - Preserve scroll position

5. **Performance Optimization**
   - Lazy render expanded content
   - Virtual scrolling for messages >1000 chars
   - Debounce expansion actions
   - Memoize rendered markdown

6. **User Experience**
   - Visual indicators for expandable content
   - Character count display
   - Copy-to-clipboard functionality
   - Responsive design for mobile

#### Non-Functional Requirements

1. **Performance Targets**
   - Initial render: <100ms
   - Expansion animation: <200ms
   - Markdown parsing: <50ms for 1000 chars
   - No frame drops during expansion

2. **Accessibility**
   - WCAG 2.1 Level AA compliance
   - Screen reader support
   - Keyboard navigation
   - Focus management

3. **Browser Support**
   - Chrome/Edge 90+
   - Firefox 88+
   - Safari 14+
   - Mobile browsers (iOS Safari, Chrome Mobile)

### 1.2 Props Interfaces

```typescript
/**
 * Main preview component props
 */
interface MessagePreviewProps {
  /** Input message content */
  input: string;

  /** Response/output content */
  response: string;

  /** Preview length in characters (default: 200) */
  previewLength?: number;

  /** Maximum expanded content length before virtualization (default: 1000) */
  virtualizationThreshold?: number;

  /** Enable markdown rendering for response (default: true) */
  enableMarkdown?: boolean;

  /** Enable syntax highlighting (default: true) */
  enableSyntaxHighlighting?: boolean;

  /** Initial expanded state (default: false) */
  defaultExpanded?: boolean;

  /** Callback when expansion state changes */
  onExpandChange?: (expanded: boolean) => void;

  /** Custom CSS class */
  className?: string;

  /** Test ID for testing */
  testId?: string;
}

/**
 * Content section props (reusable for input/response)
 */
interface ContentSectionProps {
  /** Section label (e.g., "Input", "Response") */
  label: string;

  /** Content to display */
  content: string;

  /** Whether this section is expanded */
  expanded: boolean;

  /** Toggle expansion */
  onToggle: () => void;

  /** Preview length */
  previewLength: number;

  /** Enable markdown rendering */
  enableMarkdown: boolean;

  /** Enable syntax highlighting */
  enableSyntaxHighlighting: boolean;

  /** Content type indicator */
  type: 'input' | 'response';

  /** Test ID */
  testId?: string;
}

/**
 * Markdown renderer props
 */
interface MarkdownRendererProps {
  /** Markdown content */
  content: string;

  /** Enable syntax highlighting in code blocks */
  enableSyntaxHighlighting: boolean;

  /** CSS class for container */
  className?: string;
}

/**
 * Virtual scrollable content props
 */
interface VirtualContentProps {
  /** Content to render */
  content: string;

  /** Render function for content */
  renderContent: (content: string) => React.ReactNode;

  /** Container height */
  maxHeight?: number;

  /** Chunk size for virtualization */
  chunkSize?: number;
}

/**
 * Expansion control button props
 */
interface ExpansionControlProps {
  /** Is content expanded */
  expanded: boolean;

  /** Toggle handler */
  onToggle: () => void;

  /** Content length */
  contentLength: number;

  /** Preview length */
  previewLength: number;

  /** Label for accessibility */
  label: string;

  /** Test ID */
  testId?: string;
}
```

### 1.3 State Management

#### Component State

```typescript
/**
 * State for MessagePreview component
 */
interface MessagePreviewState {
  /** Is input section expanded */
  inputExpanded: boolean;

  /** Is response section expanded */
  responseExpanded: boolean;

  /** Is markdown parsing in progress */
  isParsing: boolean;

  /** Parsed markdown cache */
  markdownCache: Map<string, React.ReactNode>;

  /** Copy button state */
  copyState: {
    input: 'idle' | 'copying' | 'success';
    response: 'idle' | 'copying' | 'success';
  };
}
```

#### Hooks Strategy

1. **useState** - For expansion state and UI feedback
2. **useMemo** - For markdown parsing memoization
3. **useCallback** - For event handlers
4. **useRef** - For content container refs
5. **Custom Hook: useVirtualScroll** - For virtualization logic
6. **Custom Hook: useMarkdownParser** - For markdown parsing with cache

### 1.4 Edge Cases & Error Handling

#### Edge Cases

1. **Empty Content**
   - Input: "", Response: "" → Show "No content" placeholder
   - Input: valid, Response: "" → Show input, hide response section
   - Input: "", Response: valid → Hide input section, show response

2. **Very Long Content**
   - Content >1000 chars → Enable virtual scrolling
   - Content >10000 chars → Add warning indicator
   - Content >50000 chars → Recommend export instead

3. **Special Characters**
   - Unicode content → Proper UTF-8 handling
   - Emojis → Render correctly
   - HTML entities → Escape properly
   - Code injection attempts → Sanitize

4. **Malformed Markdown**
   - Invalid syntax → Render as plain text
   - Unclosed tags → Graceful fallback
   - Circular references → Prevention

5. **Performance Edge Cases**
   - Rapid expansion/collapse → Debounce
   - Multiple expanded at once → Lazy render
   - Window resize during expansion → Reflow handling

#### Error Handling

```typescript
/**
 * Error boundary for preview components
 */
interface PreviewErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Fallback strategies
 */
enum FallbackStrategy {
  PLAIN_TEXT = 'plain_text',     // Render without markdown
  TRUNCATED = 'truncated',        // Show truncated version only
  ERROR_MESSAGE = 'error_message' // Show error with retry
}
```

---

## Phase 2: PSEUDOCODE

### 2.1 Core Algorithms

#### Algorithm 1: Content Expansion/Collapse

```
FUNCTION toggleExpansion(section: 'input' | 'response'):
  INPUT: section identifier
  OUTPUT: updated expansion state

  1. Get current expansion state for section
  2. IF section is currently collapsed:
       a. Set expansion state to true
       b. Trigger enter animation (opacity 0 → 1, height 0 → auto)
       c. Focus on expanded content container
       d. IF content length > virtualizationThreshold:
            i. Initialize virtual scroll
            ii. Render first chunk only
       e. ELSE:
            i. Render full content
     ELSE:
       a. Set expansion state to false
       b. Trigger exit animation (opacity 1 → 0, height auto → 0)
       c. Return focus to toggle button
  3. Call onExpandChange callback if provided
  4. Update accessibility attributes (aria-expanded)

  PERFORMANCE: Debounce rapid toggles (200ms)
  EDGE CASE: Handle multiple rapid clicks
```

#### Algorithm 2: Markdown Parsing with Caching

```
FUNCTION parseMarkdown(content: string, cache: Map):
  INPUT: raw markdown content, cache map
  OUTPUT: rendered React nodes

  1. Generate content hash (for cache key)
  2. Check if parsed content exists in cache:
       IF cache.has(hash):
         RETURN cache.get(hash)

  3. Parse markdown:
       TRY:
         a. Split content into blocks (paragraphs, code, lists, etc.)
         b. FOR EACH block:
              i. Identify block type
              ii. IF code block:
                   - Extract language hint
                   - Apply syntax highlighting
                   - Wrap in <pre><code>
              iii. IF markdown element:
                   - Convert to React component
                   - Apply styling
              iv. IF plain text:
                   - Wrap in <p>
         c. Combine blocks into node tree
       CATCH (error):
         a. Log error
         b. RETURN plain text fallback

  4. Store result in cache
  5. RETURN rendered nodes

  OPTIMIZATION: Limit cache size to 50 entries (LRU)
  EDGE CASE: Handle malformed markdown gracefully
```

#### Algorithm 3: Virtual Scrolling

```
FUNCTION virtualScroll(content: string, containerHeight: number):
  INPUT: full content, container height
  OUTPUT: visible content chunks

  1. Calculate metrics:
       chunkSize = 1000 characters
       lineHeight = 20px
       visibleLines = containerHeight / lineHeight
       bufferLines = 10 (for smooth scrolling)

  2. Split content into chunks:
       chunks = []
       FOR i = 0 TO content.length STEP chunkSize:
         chunk = content.substring(i, i + chunkSize)
         chunks.push(chunk)

  3. Track scroll position:
       currentScrollTop = scrollContainer.scrollTop
       firstVisibleChunk = floor(currentScrollTop / (chunkSize * lineHeight))
       lastVisibleChunk = firstVisibleChunk + ceil(visibleLines / chunkSize) + bufferLines

  4. Render only visible chunks:
       visibleChunks = chunks.slice(firstVisibleChunk, lastVisibleChunk)
       RETURN visibleChunks with proper offsets

  OPTIMIZATION: Use requestAnimationFrame for scroll updates
  EDGE CASE: Handle variable line heights
```

#### Algorithm 4: Syntax Highlighting Detection

```
FUNCTION detectLanguage(codeBlock: string):
  INPUT: code block content
  OUTPUT: language identifier

  1. Check for explicit language marker:
       IF codeBlock.startsWith('```language'):
         RETURN extracted language

  2. Analyze code patterns:
       patterns = {
         'import.*from': 'javascript',
         'def.*:': 'python',
         'public class': 'java',
         '<.*>.*</.*>': 'html',
         // ... more patterns
       }

       FOR EACH pattern IN patterns:
         IF regex.test(codeBlock, pattern):
           RETURN patterns[pattern]

  3. Default fallback:
       RETURN 'plaintext'

  OPTIMIZATION: Cache detection results
  EDGE CASE: Mixed language blocks → default to first detected
```

### 2.2 Event Flow Diagrams

```
User Click on "Expand" Button
         |
         v
  toggleExpansion(section)
         |
         |---> Check current state
         |
         |---> Update state (collapsed → expanded)
         |
         |---> Trigger animation
         |
         |---> Content length check
         |           |
         |           |---> < 1000 chars → Render full content
         |           |
         |           |---> > 1000 chars → Initialize virtual scroll
         |                                      |
         |                                      v
         |                               Render first chunk
         |                                      |
         |                                      v
         |                               Listen for scroll events
         |                                      |
         |                                      v
         |                               Load more chunks on scroll
         |
         |---> Parse markdown (if enabled)
         |           |
         |           |---> Check cache
         |           |
         |           |---> Parse if not cached
         |           |
         |           |---> Apply syntax highlighting
         |
         |---> Update DOM
         |
         v
  Content displayed (expanded)
```

---

## Phase 3: ARCHITECTURE

### 3.1 Component Hierarchy

```
MessagePreview (Container)
├── InputSection (ContentSection)
│   ├── SectionHeader
│   │   ├── Label ("Input")
│   │   ├── CharacterCount
│   │   └── CopyButton
│   ├── PreviewContent
│   │   └── PlainTextPreview (truncated)
│   ├── ExpansionControl
│   └── ExpandedContent (conditional)
│       ├── VirtualScrollContainer (if >1000 chars)
│       │   └── PlainTextContent (chunked)
│       └── PlainTextContent (if <=1000 chars)
│
└── ResponseSection (ContentSection)
    ├── SectionHeader
    │   ├── Label ("Response")
    │   ├── CharacterCount
    │   └── CopyButton
    ├── PreviewContent
    │   └── MarkdownPreview (truncated, rendered)
    ├── ExpansionControl
    └── ExpandedContent (conditional)
        ├── VirtualScrollContainer (if >1000 chars)
        │   └── MarkdownRenderer (chunked)
        └── MarkdownRenderer (if <=1000 chars)
            └── CodeBlock (with syntax highlighting)

Shared Components:
├── MarkdownRenderer
│   ├── ParagraphBlock
│   ├── CodeBlock
│   │   └── SyntaxHighlighter
│   ├── ListBlock
│   ├── TableBlock
│   └── BlockquoteBlock
│
├── VirtualScrollContainer
│   ├── ScrollViewport
│   ├── ScrollSpacer (for total content height)
│   └── VisibleChunks
│
└── ExpansionControl
    ├── ExpandButton
    └── CollapseButton
```

### 3.2 Component Specifications

#### MessagePreview (Main Container)

```typescript
/**
 * Main preview component - orchestrates input and response display
 */
export const MessagePreview: React.FC<MessagePreviewProps> = ({
  input,
  response,
  previewLength = 200,
  virtualizationThreshold = 1000,
  enableMarkdown = true,
  enableSyntaxHighlighting = true,
  defaultExpanded = false,
  onExpandChange,
  className,
  testId = 'message-preview',
}) => {
  // State management
  const [inputExpanded, setInputExpanded] = useState(defaultExpanded);
  const [responseExpanded, setResponseExpanded] = useState(defaultExpanded);

  // Memoized handlers
  const handleInputToggle = useCallback(() => {
    setInputExpanded(prev => {
      const newState = !prev;
      onExpandChange?.(newState);
      return newState;
    });
  }, [onExpandChange]);

  const handleResponseToggle = useCallback(() => {
    setResponseExpanded(prev => {
      const newState = !prev;
      onExpandChange?.(newState);
      return newState;
    });
  }, [onExpandChange]);

  // Render sections conditionally
  const showInput = input && input.trim().length > 0;
  const showResponse = response && response.trim().length > 0;

  return (
    <div className={cn("message-preview", className)} data-testid={testId}>
      {showInput && (
        <ContentSection
          label="Input"
          content={input}
          expanded={inputExpanded}
          onToggle={handleInputToggle}
          previewLength={previewLength}
          enableMarkdown={false} // Input is always plain text
          enableSyntaxHighlighting={false}
          type="input"
          testId={`${testId}-input`}
        />
      )}

      {showResponse && (
        <ContentSection
          label="Response"
          content={response}
          expanded={responseExpanded}
          onToggle={handleResponseToggle}
          previewLength={previewLength}
          enableMarkdown={enableMarkdown}
          enableSyntaxHighlighting={enableSyntaxHighlighting}
          type="response"
          testId={`${testId}-response`}
        />
      )}

      {!showInput && !showResponse && (
        <div className="empty-state" role="status">
          No content to display
        </div>
      )}
    </div>
  );
};
```

#### ContentSection (Reusable Section)

```typescript
/**
 * Reusable content section for input or response
 */
const ContentSection: React.FC<ContentSectionProps> = ({
  label,
  content,
  expanded,
  onToggle,
  previewLength,
  enableMarkdown,
  enableSyntaxHighlighting,
  type,
  testId,
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const isLongContent = content.length > 1000;
  const needsExpansion = content.length > previewLength;

  // Memoized preview content
  const previewContent = useMemo(() => {
    if (expanded) return content;
    return content.substring(0, previewLength) + (needsExpansion ? '...' : '');
  }, [content, previewLength, expanded, needsExpansion]);

  // Copy to clipboard
  const { copyToClipboard, copyState } = useCopyToClipboard();

  return (
    <div
      className={cn("content-section", `content-section-${type}`)}
      data-testid={testId}
    >
      <SectionHeader
        label={label}
        characterCount={content.length}
        onCopy={() => copyToClipboard(content)}
        copyState={copyState}
      />

      <div className="content-wrapper">
        {!expanded && (
          <PreviewContent
            content={previewContent}
            enableMarkdown={enableMarkdown}
            enableSyntaxHighlighting={enableSyntaxHighlighting}
          />
        )}

        {expanded && (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              ref={contentRef}
            >
              {isLongContent ? (
                <VirtualScrollContainer
                  content={content}
                  renderContent={(chunk) =>
                    enableMarkdown ? (
                      <MarkdownRenderer
                        content={chunk}
                        enableSyntaxHighlighting={enableSyntaxHighlighting}
                      />
                    ) : (
                      <PlainTextContent content={chunk} />
                    )
                  }
                />
              ) : (
                enableMarkdown ? (
                  <MarkdownRenderer
                    content={content}
                    enableSyntaxHighlighting={enableSyntaxHighlighting}
                  />
                ) : (
                  <PlainTextContent content={content} />
                )
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {needsExpansion && (
        <ExpansionControl
          expanded={expanded}
          onToggle={onToggle}
          contentLength={content.length}
          previewLength={previewLength}
          label={label}
          testId={`${testId}-expansion`}
        />
      )}
    </div>
  );
};
```

#### MarkdownRenderer

```typescript
/**
 * Markdown renderer with syntax highlighting
 */
const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  enableSyntaxHighlighting,
  className,
}) => {
  // Use custom hook for markdown parsing with cache
  const { renderedContent, isLoading, error } = useMarkdownParser(content);

  // Custom components for react-markdown
  const components = useMemo(() => ({
    code({ node, inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : '';

      return !inline && enableSyntaxHighlighting ? (
        <SyntaxHighlighter
          language={language || 'plaintext'}
          style={vscDarkPlus}
          PreTag="div"
          className="syntax-highlighter"
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
    // Other custom components for better rendering
    p: ({ children }) => <p className="markdown-paragraph">{children}</p>,
    a: ({ href, children }) => (
      <a href={href} target="_blank" rel="noopener noreferrer" className="markdown-link">
        {children}
      </a>
    ),
    // ... more components
  }), [enableSyntaxHighlighting]);

  if (isLoading) {
    return <div className="markdown-loading">Parsing...</div>;
  }

  if (error) {
    return (
      <div className="markdown-error">
        <PlainTextContent content={content} />
      </div>
    );
  }

  return (
    <div className={cn("markdown-renderer", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
```

#### VirtualScrollContainer

```typescript
/**
 * Virtual scrolling container for large content
 */
const VirtualScrollContainer: React.FC<VirtualContentProps> = ({
  content,
  renderContent,
  maxHeight = 400,
  chunkSize = 1000,
}) => {
  const { visibleChunks, totalHeight, scrollOffset } = useVirtualScroll({
    content,
    chunkSize,
    maxHeight,
  });

  return (
    <div
      className="virtual-scroll-container"
      style={{ maxHeight: `${maxHeight}px`, overflowY: 'auto' }}
    >
      <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
        <div style={{ transform: `translateY(${scrollOffset}px)` }}>
          {visibleChunks.map((chunk, index) => (
            <div key={index} className="virtual-chunk">
              {renderContent(chunk)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
```

### 3.3 Custom Hooks

#### useMarkdownParser

```typescript
/**
 * Custom hook for markdown parsing with caching
 */
const useMarkdownParser = (content: string) => {
  const [state, setState] = useState({
    renderedContent: null,
    isLoading: true,
    error: null,
  });

  const cacheRef = useRef(new Map());

  useEffect(() => {
    const hash = generateHash(content);

    if (cacheRef.current.has(hash)) {
      setState({
        renderedContent: cacheRef.current.get(hash),
        isLoading: false,
        error: null,
      });
      return;
    }

    // Parse markdown asynchronously
    const parseAsync = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true }));

        // Simulate async parsing (can be replaced with worker)
        await new Promise(resolve => setTimeout(resolve, 0));

        const rendered = parseMarkdown(content);

        // Update cache (LRU - limit to 50 entries)
        if (cacheRef.current.size >= 50) {
          const firstKey = cacheRef.current.keys().next().value;
          cacheRef.current.delete(firstKey);
        }
        cacheRef.current.set(hash, rendered);

        setState({
          renderedContent: rendered,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        setState({
          renderedContent: null,
          isLoading: false,
          error: error.message,
        });
      }
    };

    parseAsync();
  }, [content]);

  return state;
};
```

#### useVirtualScroll

```typescript
/**
 * Custom hook for virtual scrolling
 */
const useVirtualScroll = ({ content, chunkSize, maxHeight }) => {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const chunks = useMemo(() => {
    const result = [];
    for (let i = 0; i < content.length; i += chunkSize) {
      result.push(content.substring(i, i + chunkSize));
    }
    return result;
  }, [content, chunkSize]);

  const LINE_HEIGHT = 20;
  const totalHeight = chunks.length * chunkSize * (LINE_HEIGHT / 100);

  const visibleRange = useMemo(() => {
    const startIndex = Math.floor(scrollTop / (chunkSize * LINE_HEIGHT / 100));
    const endIndex = Math.ceil((scrollTop + maxHeight) / (chunkSize * LINE_HEIGHT / 100)) + 1;
    return { startIndex: Math.max(0, startIndex - 1), endIndex: Math.min(chunks.length, endIndex + 1) };
  }, [scrollTop, maxHeight, chunks.length, chunkSize]);

  const visibleChunks = useMemo(() => {
    return chunks.slice(visibleRange.startIndex, visibleRange.endIndex);
  }, [chunks, visibleRange]);

  const scrollOffset = visibleRange.startIndex * chunkSize * (LINE_HEIGHT / 100);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return { visibleChunks, totalHeight, scrollOffset, containerRef };
};
```

#### useCopyToClipboard

```typescript
/**
 * Custom hook for copy to clipboard functionality
 */
const useCopyToClipboard = () => {
  const [copyState, setCopyState] = useState<'idle' | 'copying' | 'success'>('idle');

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      setCopyState('copying');
      await navigator.clipboard.writeText(text);
      setCopyState('success');
      setTimeout(() => setCopyState('idle'), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      setCopyState('idle');
    }
  }, []);

  return { copyToClipboard, copyState };
};
```

### 3.4 File Structure

```
frontend/src/components/TokenAnalytics/
├── MessagePreview/
│   ├── index.ts                           # Barrel export
│   ├── MessagePreview.tsx                 # Main component
│   ├── ContentSection.tsx                 # Section component
│   ├── SectionHeader.tsx                  # Header with copy button
│   ├── MarkdownRenderer.tsx               # Markdown rendering
│   ├── VirtualScrollContainer.tsx         # Virtual scroll
│   ├── ExpansionControl.tsx               # Expand/collapse button
│   ├── PreviewContent.tsx                 # Preview display
│   ├── PlainTextContent.tsx               # Plain text display
│   │
│   ├── hooks/
│   │   ├── useMarkdownParser.ts           # Markdown parsing hook
│   │   ├── useVirtualScroll.ts            # Virtual scroll hook
│   │   └── useCopyToClipboard.ts          # Copy functionality hook
│   │
│   ├── utils/
│   │   ├── markdownParser.ts              # Markdown parsing logic
│   │   ├── syntaxDetection.ts             # Language detection
│   │   └── contentUtils.ts                # Content manipulation utils
│   │
│   ├── styles/
│   │   ├── MessagePreview.module.css      # Component styles
│   │   └── markdown.css                   # Markdown styles
│   │
│   └── types/
│       └── index.ts                       # TypeScript interfaces
│
├── TokenAnalyticsDashboard.tsx            # Updated dashboard
│
└── __tests__/
    ├── MessagePreview.test.tsx            # Unit tests
    ├── MarkdownRenderer.test.tsx          # Markdown tests
    └── VirtualScrollContainer.test.tsx    # Virtual scroll tests
```

---

## Phase 4: REFINEMENT

### 4.1 Performance Optimizations

#### 4.1.1 Memoization Strategy

```typescript
/**
 * Memoization points in MessagePreview component
 */

// 1. Memoize preview content generation
const previewContent = useMemo(() => {
  if (expanded) return content;
  return truncateContent(content, previewLength);
}, [content, previewLength, expanded]);

// 2. Memoize markdown rendering
const renderedMarkdown = useMemo(() => {
  return parseMarkdown(content);
}, [content]); // Only re-parse when content changes

// 3. Memoize expansion handlers
const handleToggle = useCallback(() => {
  setExpanded(prev => !prev);
}, []); // No dependencies, stable reference

// 4. Memoize React.memo for child components
const ContentSection = React.memo(ContentSectionImpl, (prev, next) => {
  return prev.content === next.content &&
         prev.expanded === next.expanded &&
         prev.enableMarkdown === next.enableMarkdown;
});
```

#### 4.1.2 Lazy Loading

```typescript
/**
 * Lazy load heavy components
 */

// Lazy load syntax highlighter (heavy dependency)
const SyntaxHighlighter = lazy(() =>
  import('react-syntax-highlighter').then(module => ({
    default: module.Prism
  }))
);

// Lazy load markdown renderer
const MarkdownRenderer = lazy(() => import('./MarkdownRenderer'));

// Wrap in Suspense
<Suspense fallback={<LoadingSpinner />}>
  <MarkdownRenderer content={content} />
</Suspense>
```

#### 4.1.3 Debouncing & Throttling

```typescript
/**
 * Debounce rapid expansion toggles
 */
const debouncedToggle = useMemo(
  () => debounce((newState: boolean) => {
    setExpanded(newState);
    onExpandChange?.(newState);
  }, 200),
  [onExpandChange]
);

/**
 * Throttle scroll events for virtual scrolling
 */
const throttledScroll = useMemo(
  () => throttle((scrollTop: number) => {
    setScrollPosition(scrollTop);
  }, 16), // 60fps
  []
);
```

#### 4.1.4 Virtual Scrolling Optimization

```typescript
/**
 * Optimized virtual scrolling with RAF
 */
const useVirtualScrollOptimized = ({ content, chunkSize, maxHeight }) => {
  const rafRef = useRef<number>();

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      setScrollTop(e.currentTarget.scrollTop);
    });
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  // ... rest of implementation
};
```

### 4.2 Edge Case Handling

#### 4.2.1 Content Sanitization

```typescript
/**
 * Sanitize content to prevent XSS
 */
const sanitizeContent = (content: string): string => {
  // Remove dangerous HTML tags
  const dangerous = /<script|<iframe|<object|<embed/gi;
  if (dangerous.test(content)) {
    console.warn('Dangerous content detected, sanitizing...');
    return content.replace(dangerous, '&lt;$&');
  }

  // Escape HTML entities
  return content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};
```

#### 4.2.2 Empty State Handling

```typescript
/**
 * Handle empty/null content gracefully
 */
const EmptyState: React.FC<{ type: 'input' | 'response' }> = ({ type }) => (
  <div className="empty-state" role="status">
    <div className="empty-icon">
      {type === 'input' ? <FileQuestion /> : <MessageCircleOff />}
    </div>
    <p className="empty-text">
      No {type} content to display
    </p>
  </div>
);

// Usage in ContentSection
{content && content.trim() ? (
  <PreviewContent content={content} />
) : (
  <EmptyState type={type} />
)}
```

#### 4.2.3 Error Boundaries

```typescript
/**
 * Error boundary for preview components
 */
class PreviewErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Preview Error:', error, errorInfo);
    // Log to monitoring service
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="preview-error">
          <AlertTriangle />
          <p>Failed to render preview</p>
          <button onClick={() => this.setState({ hasError: false })}>
            Try Again
          </button>
          <details>
            <summary>Error Details</summary>
            <pre>{this.state.error?.message}</pre>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}
```

#### 4.2.4 Unicode & Emoji Support

```typescript
/**
 * Proper Unicode handling
 */
const getCharacterCount = (content: string): number => {
  // Use Array.from to count Unicode characters correctly
  return Array.from(content).length;
};

const truncateContent = (content: string, maxLength: number): string => {
  const chars = Array.from(content);
  if (chars.length <= maxLength) return content;

  // Truncate at character boundary, not byte boundary
  return chars.slice(0, maxLength).join('') + '...';
};
```

### 4.3 Accessibility Enhancements

#### 4.3.1 ARIA Attributes

```typescript
/**
 * Comprehensive ARIA support
 */
<div
  className="content-section"
  role="region"
  aria-label={`${label} content`}
  aria-expanded={expanded}
  aria-live="polite"
>
  <button
    onClick={onToggle}
    aria-label={expanded ? `Collapse ${label}` : `Expand ${label}`}
    aria-controls={`content-${id}`}
    aria-expanded={expanded}
  >
    {expanded ? <ChevronUp /> : <ChevronDown />}
  </button>

  <div
    id={`content-${id}`}
    role="document"
    aria-label="Content"
    tabIndex={expanded ? 0 : -1}
  >
    {/* Content here */}
  </div>
</div>
```

#### 4.3.2 Keyboard Navigation

```typescript
/**
 * Keyboard accessibility
 */
const handleKeyDown = (e: React.KeyboardEvent) => {
  switch (e.key) {
    case 'Enter':
    case ' ':
      e.preventDefault();
      onToggle();
      break;
    case 'Escape':
      if (expanded) {
        onToggle();
        // Return focus to trigger button
        buttonRef.current?.focus();
      }
      break;
  }
};
```

#### 4.3.3 Focus Management

```typescript
/**
 * Focus management for expansion
 */
const contentRef = useRef<HTMLDivElement>(null);
const buttonRef = useRef<HTMLButtonElement>(null);

const handleToggle = useCallback(() => {
  setExpanded(prev => {
    const newState = !prev;

    if (newState) {
      // When expanding, focus on content
      setTimeout(() => {
        contentRef.current?.focus();
      }, 300); // After animation
    } else {
      // When collapsing, focus on button
      buttonRef.current?.focus();
    }

    return newState;
  });
}, []);
```

### 4.4 Testing Strategy

#### 4.4.1 Unit Tests

```typescript
/**
 * Unit test examples
 */
describe('MessagePreview', () => {
  test('renders input and response sections', () => {
    render(
      <MessagePreview
        input="Test input"
        response="Test response"
      />
    );

    expect(screen.getByText(/Input/i)).toBeInTheDocument();
    expect(screen.getByText(/Response/i)).toBeInTheDocument();
  });

  test('expands content on button click', async () => {
    const user = userEvent.setup();
    render(
      <MessagePreview
        input="Short content"
        response="Test response with more than 200 characters..." // Long content
      />
    );

    const expandButton = screen.getByRole('button', { name: /expand/i });
    await user.click(expandButton);

    expect(screen.getByText(/collapse/i)).toBeInTheDocument();
  });

  test('handles empty content gracefully', () => {
    render(<MessagePreview input="" response="" />);

    expect(screen.getByText(/no content/i)).toBeInTheDocument();
  });

  test('sanitizes dangerous content', () => {
    const dangerousContent = '<script>alert("xss")</script>';
    render(<MessagePreview input={dangerousContent} response="" />);

    // Should not execute script
    expect(screen.queryByText('alert("xss")')).not.toBeInTheDocument();
  });
});
```

#### 4.4.2 Integration Tests

```typescript
/**
 * Integration test with TokenAnalyticsDashboard
 */
describe('MessagePreview Integration', () => {
  test('integrates with TokenAnalyticsDashboard', async () => {
    const mockMessages: TokenUsageRecord[] = [
      {
        id: '1',
        message_preview: 'User input',
        response_preview: '# Markdown Response\n\nWith **bold** text',
        // ... other fields
      },
    ];

    render(<TokenAnalyticsDashboard messages={mockMessages} />);

    // Should render preview in message list
    expect(screen.getByText(/User input/i)).toBeInTheDocument();
    expect(screen.getByText(/Markdown Response/i)).toBeInTheDocument();
  });
});
```

#### 4.4.3 Performance Tests

```typescript
/**
 * Performance benchmarks
 */
describe('Performance', () => {
  test('renders large content within 100ms', async () => {
    const largeContent = 'x'.repeat(10000);

    const startTime = performance.now();
    render(
      <MessagePreview
        input={largeContent}
        response={largeContent}
      />
    );
    const endTime = performance.now();

    expect(endTime - startTime).toBeLessThan(100);
  });

  test('virtual scrolling activates for content >1000 chars', () => {
    const largeContent = 'x'.repeat(1500);

    render(
      <MessagePreview
        input={largeContent}
        response=""
        defaultExpanded
      />
    );

    expect(screen.getByTestId('virtual-scroll-container')).toBeInTheDocument();
  });
});
```

---

## Phase 5: COMPLETION

### 5.1 Integration with TokenAnalyticsDashboard

#### Step 1: Update TokenUsageRecord Interface

```typescript
// In TokenAnalyticsDashboard.tsx, update the interface
interface TokenUsageRecord {
  id: string;
  timestamp: string;
  session_id: string;
  request_id: string;
  message_id?: string;
  provider: string;
  model: string;
  request_type: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost_total: number;
  processing_time_ms: number;
  message_preview: string;
  response_preview: string;
  component?: string;

  // NEW: Optional full content fields
  message_full?: string;  // Full input content if available
  response_full?: string; // Full response content if available
}
```

#### Step 2: Replace MessageList Component

```typescript
// In TokenAnalyticsDashboard.tsx, update the MessageList component

import { MessagePreview } from './MessagePreview';

const MessageList = ({ messages, searchTerm, onSearchChange }: MessageListProps) => {
  const filteredMessages = useMemo(() => {
    if (!searchTerm) return messages;
    return messages.filter(msg =>
      (msg.message_preview || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (msg.response_preview || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.provider.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (msg.component || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [messages, searchTerm]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Recent Messages</h3>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search messages..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      <div className="max-h-[800px] overflow-y-auto">
        {filteredMessages.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {searchTerm ? 'No messages match your search.' : 'No messages found.'}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredMessages.map((message) => (
              <div key={message.id} className="p-4 hover:bg-gray-50">
                {/* Metadata section */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {message.provider}
                      </span>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {message.model}
                      </span>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {message.request_type}
                      </span>
                      {message.component && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          {message.component}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span title={message.timestamp}>
                        {new Date(message.timestamp).toLocaleString()}
                      </span>
                      <span title={`Input: ${message.input_tokens?.toLocaleString() || 0}, Output: ${message.output_tokens?.toLocaleString() || 0}`}>
                        {(message.total_tokens || 0).toLocaleString()} tokens
                      </span>
                      <span>${(message.cost_total || 0).toFixed(4)}</span>
                      {message.processing_time_ms && (
                        <span>{message.processing_time_ms}ms</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* NEW: Enhanced Preview Component */}
                <MessagePreview
                  input={message.message_full || message.message_preview}
                  response={message.response_full || message.response_preview}
                  previewLength={200}
                  virtualizationThreshold={1000}
                  enableMarkdown={true}
                  enableSyntaxHighlighting={true}
                  testId={`message-preview-${message.id}`}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
```

#### Step 3: Add Dependencies

```bash
# Ensure these packages are installed
npm install react-markdown remark-gfm react-syntax-highlighter
npm install --save-dev @types/react-syntax-highlighter
```

#### Step 4: Update Import Statements

```typescript
// At the top of TokenAnalyticsDashboard.tsx
import { MessagePreview } from './MessagePreview';
```

#### Step 5: Update Styles

```typescript
// Add to TokenAnalyticsDashboard.tsx or global CSS
const styles = `
  .message-preview {
    margin-top: 0.75rem;
  }

  .markdown-renderer {
    font-size: 0.875rem;
    line-height: 1.5;
  }

  .markdown-renderer h1 { font-size: 1.25rem; margin: 0.5rem 0; }
  .markdown-renderer h2 { font-size: 1.125rem; margin: 0.5rem 0; }
  .markdown-renderer h3 { font-size: 1rem; margin: 0.5rem 0; }
  .markdown-renderer p { margin: 0.5rem 0; }
  .markdown-renderer ul, .markdown-renderer ol { margin-left: 1.5rem; }
  .markdown-renderer code {
    background-color: #f3f4f6;
    padding: 0.125rem 0.25rem;
    border-radius: 0.25rem;
    font-family: 'Courier New', monospace;
  }
  .markdown-renderer pre {
    background-color: #1e1e1e;
    padding: 1rem;
    border-radius: 0.375rem;
    overflow-x: auto;
    margin: 0.75rem 0;
  }
`;
```

### 5.2 Backend API Considerations

#### Optional: Add Full Content Endpoint

```python
# In backend token analytics router (if needed)

@router.get("/messages/{message_id}/full")
async def get_full_message_content(
    message_id: str,
    db: Session = Depends(get_db)
):
    """
    Get full content for a specific message
    (if storing full content separately for performance)
    """
    record = db.query(TokenUsage).filter(
        TokenUsage.message_id == message_id
    ).first()

    if not record:
        raise HTTPException(status_code=404, detail="Message not found")

    return {
        "message_id": message_id,
        "message_full": record.message_full,
        "response_full": record.response_full,
    }
```

### 5.3 Migration Checklist

- [ ] Install dependencies (react-markdown, remark-gfm, react-syntax-highlighter)
- [ ] Create MessagePreview component directory structure
- [ ] Implement core MessagePreview component
- [ ] Implement ContentSection subcomponent
- [ ] Implement MarkdownRenderer with syntax highlighting
- [ ] Implement VirtualScrollContainer for large content
- [ ] Create custom hooks (useMarkdownParser, useVirtualScroll, useCopyToClipboard)
- [ ] Add utility functions for content manipulation
- [ ] Write unit tests for MessagePreview
- [ ] Write integration tests with TokenAnalyticsDashboard
- [ ] Update TokenAnalyticsDashboard MessageList component
- [ ] Add styles and CSS modules
- [ ] Test with real data from backend
- [ ] Performance testing with large content
- [ ] Accessibility testing (keyboard, screen reader)
- [ ] Cross-browser testing
- [ ] Mobile responsive testing
- [ ] Update documentation
- [ ] Code review and refinement

### 5.4 Testing Plan

#### Unit Tests
```bash
npm test -- MessagePreview.test.tsx
npm test -- MarkdownRenderer.test.tsx
npm test -- VirtualScrollContainer.test.tsx
```

#### Integration Tests
```bash
npm test -- TokenAnalyticsDashboard.integration.test.tsx
```

#### E2E Tests
```bash
npm run test:e2e -- message-preview.spec.ts
```

#### Performance Tests
```bash
npm run test:performance -- message-preview-performance.spec.ts
```

### 5.5 Rollout Strategy

#### Phase 1: Feature Flag (Week 1)
- Deploy with feature flag disabled
- Enable for internal testing
- Gather feedback

#### Phase 2: Beta Release (Week 2)
- Enable for 10% of users
- Monitor performance metrics
- Fix any issues

#### Phase 3: Full Release (Week 3)
- Enable for 100% of users
- Monitor error rates
- Optimize based on usage patterns

### 5.6 Monitoring & Metrics

#### Performance Metrics
- Initial render time: Target <100ms
- Expansion animation: Target <200ms
- Markdown parsing time: Target <50ms
- Virtual scroll FPS: Target 60fps

#### User Metrics
- Expansion rate: % of users who expand content
- Average expanded content length
- Copy-to-clipboard usage
- Error rate

#### Technical Metrics
- Component render count
- Re-render frequency
- Memory usage
- Bundle size impact

---

## Appendix

### A. Dependencies

```json
{
  "dependencies": {
    "react-markdown": "^10.1.0",
    "remark-gfm": "^4.0.1",
    "react-syntax-highlighter": "^15.6.6",
    "framer-motion": "^12.23.13"
  },
  "devDependencies": {
    "@types/react-syntax-highlighter": "^15.5.13"
  }
}
```

### B. Bundle Size Impact

- react-markdown: ~50KB (gzipped)
- remark-gfm: ~15KB (gzipped)
- react-syntax-highlighter: ~80KB (gzipped)
- Total impact: ~145KB (gzipped)

**Optimization:** Lazy load syntax highlighter to reduce initial bundle size.

### C. Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Markdown Rendering | 90+ | 88+ | 14+ | 90+ |
| Syntax Highlighting | 90+ | 88+ | 14+ | 90+ |
| Virtual Scrolling | 90+ | 88+ | 14+ | 90+ |
| Copy to Clipboard | 76+ | 63+ | 13.1+ | 79+ |
| Framer Motion | 90+ | 88+ | 14+ | 90+ |

### D. Accessibility Checklist

- [x] Semantic HTML structure
- [x] ARIA labels and roles
- [x] Keyboard navigation support
- [x] Focus management
- [x] Screen reader announcements
- [x] Color contrast ratios (WCAG AA)
- [x] Touch target sizes (44x44px minimum)
- [x] Skip links for long content

### E. Security Considerations

1. **Content Sanitization**
   - Escape HTML entities in user input
   - Prevent XSS through markdown injection
   - Use allowlist for HTML tags in markdown

2. **Resource Limits**
   - Limit content length (max 50KB)
   - Timeout for markdown parsing (5s)
   - Prevent ReDoS in regex patterns

3. **Privacy**
   - Don't log sensitive content
   - Respect user privacy settings
   - Secure clipboard access

---

## Summary

This SPARC architecture document provides a comprehensive design for an enhanced message preview component that supports:

1. **Rich Markdown Rendering** - Full GitHub Flavored Markdown support
2. **Syntax Highlighting** - 100+ languages with react-syntax-highlighter
3. **Expandable/Collapsible UI** - Smooth animations with framer-motion
4. **Performance Optimization** - Virtual scrolling, memoization, lazy loading
5. **Accessibility** - WCAG 2.1 Level AA compliance
6. **Seamless Integration** - Drop-in replacement for existing preview in TokenAnalyticsDashboard

The component is designed to handle edge cases, optimize performance for large content, and provide an excellent user experience while maintaining code quality and testability.

**Next Steps:**
1. Review and approve architecture
2. Begin implementation following SPARC phases
3. Implement with TDD approach
4. Integrate with TokenAnalyticsDashboard
5. Test and deploy with feature flag
