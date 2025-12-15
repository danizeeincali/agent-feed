import React, { useEffect, useRef, useState, memo } from 'react';
import mermaid from 'mermaid';

/**
 * MermaidDiagram Component
 *
 * Renders Mermaid diagrams with:
 * - Error handling and validation
 * - Loading states
 * - Responsive design
 * - Dark mode compatibility
 * - Proper security (strict mode)
 * - Accessibility (ARIA labels)
 *
 * SPARC SPEC: Production-ready error boundaries and edge case handling
 */

// SPARC OPTIMIZATION: Initialize Mermaid once globally, not on every render
let mermaidInitialized = false;

const initializeMermaid = () => {
  if (!mermaidInitialized) {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'strict', // Prevent XSS attacks
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis',
      },
      sequence: {
        useMaxWidth: true,
        wrap: true,
      },
      gantt: {
        useMaxWidth: true,
      },
      er: {
        useMaxWidth: true,
      },
      pie: {
        useMaxWidth: true,
      },
      class: {
        useMaxWidth: true,
      },
      state: {
        useMaxWidth: true,
      },
      journey: {
        useMaxWidth: true,
      },
      gitGraph: {
        useMaxWidth: true,
      },
      timeline: {
        useMaxWidth: true,
      },
    });
    mermaidInitialized = true;
  }
};

interface MermaidDiagramProps {
  /** The mermaid diagram code */
  chart: string;
  /** Optional unique ID for the diagram */
  id?: string;
  /** Optional CSS class name */
  className?: string;
}

/**
 * Mermaid diagram renderer with error handling
 * OPTION A FIX: Removed hasRenderedRef guard to prevent blocking legitimate renders
 */
const MermaidDiagram: React.FC<MermaidDiagramProps> = memo(({ chart, id, className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(true);
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const renderTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    console.log('🎨 [Mermaid] useEffect triggered for diagram:', id || 'unnamed');
    console.log('📊 [Mermaid] Chart type:', chart.split('\n')[0]);

    // Track if component is still mounted to prevent state updates after unmount
    let isMounted = true;

    const renderDiagram = async () => {
      console.log('🚀 [Mermaid] Starting render for:', id || 'unnamed');

      try {
        if (isMounted) {
          setIsRendering(true);
          setError(null);
        }

        // SPARC SECURITY: Initialize mermaid once globally
        initializeMermaid();
        console.log('✅ [Mermaid] Initialized');

        // SPARC VALIDATION: Generate unique ID for this diagram
        const diagramId = id || `mermaid-${Math.random().toString(36).substring(2, 11)}`;
        console.log('🆔 [Mermaid] Diagram ID:', diagramId);

        // SPARC RENDERING: Render the diagram with timeout protection using Promise.race
        console.log('⏳ [Mermaid] Calling mermaid.render()...');
        const renderPromise = mermaid.render(diagramId, chart.trim());

        const timeoutPromise = new Promise<never>((_, reject) => {
          renderTimeoutRef.current = setTimeout(() => {
            console.log('⏱️ [Mermaid] TIMEOUT TRIGGERED after 10s');
            reject(new Error('Rendering timeout: Diagram took longer than 10 seconds to render. This may indicate invalid syntax or excessive complexity.'));
          }, 10000);
        });

        // Race between rendering and timeout
        const { svg } = await Promise.race([renderPromise, timeoutPromise]);
        console.log('🎉 [Mermaid] Render complete, SVG length:', svg.length);

        // Clear timeout if rendering succeeded
        if (renderTimeoutRef.current) {
          clearTimeout(renderTimeoutRef.current);
          renderTimeoutRef.current = null;
          console.log('🧹 [Mermaid] Timeout cleared');
        }

        // SPARC REAL FIX: Store SVG in React state instead of manual DOM manipulation
        // This prevents removeChild errors by letting React manage all children
        if (isMounted) {
          console.log('✅ [Mermaid] Storing SVG in React state (length:', svg.length, ')');
          setSvgContent(svg);  // React will handle rendering
          setIsRendering(false);
          console.log('✅ [Mermaid] Rendering complete, loading state cleared');
        } else {
          console.warn('⚠️ [Mermaid] Component unmounted during render, skipping state update');
        }
      } catch (err) {
        console.log('❌ [Mermaid] Rendering error caught:', err);

        // Clear timeout on error
        if (renderTimeoutRef.current) {
          clearTimeout(renderTimeoutRef.current);
          renderTimeoutRef.current = null;
        }

        // SPARC ERROR HANDLING: Enhanced error messages based on error type
        let errorMessage = 'Failed to render diagram';

        if (err instanceof Error) {
          // Check for specific Mermaid error patterns
          if (err.message.includes('timeout')) {
            errorMessage = err.message;
          } else if (err.message.includes('Parse error') || err.message.includes('Syntax error')) {
            errorMessage = `Invalid Mermaid syntax: ${err.message}`;
          } else if (err.message.includes('lexical error') || err.message.includes('Lexer')) {
            errorMessage = `Mermaid syntax error: ${err.message}. Check your diagram code for typos.`;
          } else if (err.message.includes('Maximum call stack')) {
            errorMessage = 'Diagram is too complex or has circular references. Try simplifying it.';
          } else {
            errorMessage = `Rendering error: ${err.message}`;
          }
        }

        console.error('❌ [Mermaid] Full error details:', {
          error: err,
          chart: chart.substring(0, 100) + '...',
          diagramType: chart.split('\n')[0],
          stack: err instanceof Error ? err.stack : undefined
        });

        if (isMounted) {
          setError(errorMessage);
          setIsRendering(false);
        }
      }
    };

    renderDiagram();

    // Cleanup function
    return () => {
      console.log('🧹 [Mermaid] Cleanup triggered for:', id || 'unnamed');
      isMounted = false;
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current);
        renderTimeoutRef.current = null;
      }
    };
  }, [chart, id]);

  // SPARC ERROR HANDLING: Display error state with helpful information
  if (error) {
    return (
      <div
        className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 my-4"
        role="alert"
        aria-live="polite"
      >
        <p className="text-red-800 dark:text-red-200 font-semibold mb-2">
          Invalid Mermaid Syntax
        </p>
        <p className="text-red-600 dark:text-red-300 text-sm mb-3">{error}</p>
        <details className="text-xs">
          <summary className="cursor-pointer text-red-700 dark:text-red-400 hover:text-red-900 dark:hover:text-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 rounded">
            Show diagram code
          </summary>
          <pre className="mt-2 p-2 bg-red-100 dark:bg-red-900/30 rounded overflow-x-auto">
            <code className="text-red-800 dark:text-red-300 text-xs font-mono">{chart}</code>
          </pre>
        </details>
      </div>
    );
  }

  // SPARC REAL FIX: Pure React solution - no manual DOM manipulation
  // React manages both loading spinner and SVG content via state
  return (
    <div
      ref={containerRef}
      className={`mermaid-diagram flex justify-center items-center my-6 p-4 bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-x-auto ${className}`}
      role={isRendering ? "status" : "img"}
      aria-label={isRendering ? "Loading diagram" : "Mermaid diagram"}
      aria-live={isRendering ? "polite" : undefined}
      style={{ maxWidth: '100%', minHeight: isRendering ? '120px' : undefined }}
    >
      {isRendering && (
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 dark:border-gray-600 border-t-gray-600 dark:border-t-gray-300"></div>
          <span className="text-gray-500 dark:text-gray-400 text-sm">
            Rendering diagram...
          </span>
        </div>
      )}
      {svgContent && !isRendering && (
        <div dangerouslySetInnerHTML={{ __html: svgContent }} />
      )}
    </div>
  );
});

MermaidDiagram.displayName = 'MermaidDiagram';

export default MermaidDiagram;
