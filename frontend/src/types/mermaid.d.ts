/**
 * TypeScript type definitions for Mermaid.js integration
 *
 * These types provide IntelliSense and type safety for Mermaid diagram rendering
 * in the MarkdownRenderer component.
 */

declare module 'mermaid' {
  export interface MermaidConfig {
    /** Whether to start rendering on load */
    startOnLoad?: boolean;

    /** Theme to use for diagrams */
    theme?: 'default' | 'forest' | 'dark' | 'neutral' | 'base';

    /** Theme variables for customization */
    themeVariables?: Record<string, string>;

    /** Security level for diagram rendering */
    securityLevel?: 'strict' | 'loose' | 'antiscript' | 'sandbox';

    /** Logging level */
    logLevel?: 'debug' | 'info' | 'warn' | 'error' | 'fatal';

    /** Flowchart configuration */
    flowchart?: {
      useMaxWidth?: boolean;
      htmlLabels?: boolean;
      curve?: 'basis' | 'linear' | 'cardinal';
      diagramPadding?: number;
      nodeSpacing?: number;
      rankSpacing?: number;
      defaultRenderer?: 'dagre-d3' | 'dagre-wrapper' | 'elk';
    };

    /** Sequence diagram configuration */
    sequence?: {
      useMaxWidth?: boolean;
      diagramMarginX?: number;
      diagramMarginY?: number;
      actorMargin?: number;
      width?: number;
      height?: number;
      boxMargin?: number;
      boxTextMargin?: number;
      noteMargin?: number;
      messageMargin?: number;
      mirrorActors?: boolean;
      bottomMarginAdj?: number;
      wrap?: boolean;
      wrapPadding?: number;
    };

    /** Gantt chart configuration */
    gantt?: {
      useMaxWidth?: boolean;
      titleTopMargin?: number;
      barHeight?: number;
      barGap?: number;
      topPadding?: number;
      leftPadding?: number;
      gridLineStartPadding?: number;
      fontSize?: number;
      numberSectionStyles?: number;
      axisFormat?: string;
      topAxis?: boolean;
    };

    /** Class diagram configuration */
    class?: {
      useMaxWidth?: boolean;
      defaultRenderer?: 'dagre-d3' | 'dagre-wrapper' | 'elk';
    };

    /** State diagram configuration */
    state?: {
      useMaxWidth?: boolean;
      defaultRenderer?: 'dagre-d3' | 'dagre-wrapper' | 'elk';
    };

    /** ER diagram configuration */
    er?: {
      useMaxWidth?: boolean;
      diagramPadding?: number;
      layoutDirection?: 'TB' | 'BT' | 'LR' | 'RL';
      minEntityWidth?: number;
      minEntityHeight?: number;
      entityPadding?: number;
      stroke?: string;
      fill?: string;
      fontSize?: number;
    };

    /** Pie chart configuration */
    pie?: {
      useMaxWidth?: boolean;
      textPosition?: number;
    };

    /** Git graph configuration */
    gitGraph?: {
      useMaxWidth?: boolean;
      diagramPadding?: number;
      nodeLabel?: {
        width?: number;
        height?: number;
        x?: number;
        y?: number;
      };
      mainBranchName?: string;
      mainBranchOrder?: number;
      showCommitLabel?: boolean;
      showBranches?: boolean;
      rotateCommitLabel?: boolean;
    };

    /** Journey diagram configuration */
    journey?: {
      useMaxWidth?: boolean;
      diagramMarginX?: number;
      diagramMarginY?: number;
      actorMargin?: number;
      width?: number;
      height?: number;
      boxMargin?: number;
      boxTextMargin?: number;
    };

    /** Timeline configuration */
    timeline?: {
      useMaxWidth?: boolean;
      diagramMarginX?: number;
      diagramMarginY?: number;
      leftMargin?: number;
      width?: number;
      height?: number;
      padding?: number;
    };
  }

  export interface RenderResult {
    /** The rendered SVG as a string */
    svg: string;

    /** Bind functions for interactive elements */
    bindFunctions?: (element: Element) => void;
  }

  export interface ParseResult {
    /** Whether the diagram is valid */
    valid: boolean;

    /** Error message if invalid */
    error?: string;
  }

  /**
   * Initialize Mermaid with configuration
   */
  export function initialize(config: MermaidConfig): void;

  /**
   * Render a Mermaid diagram
   * @param id - Unique ID for the diagram
   * @param text - Mermaid diagram text
   * @param container - Optional container element
   * @returns Rendered SVG result
   */
  export function render(
    id: string,
    text: string,
    container?: Element
  ): Promise<RenderResult>;

  /**
   * Parse and validate Mermaid diagram syntax
   * @param text - Mermaid diagram text
   * @returns Whether the syntax is valid
   */
  export function parse(text: string): Promise<boolean>;

  /**
   * Get the current configuration
   */
  export function getConfig(): MermaidConfig;

  /**
   * Update the configuration
   */
  export function updateConfig(config: Partial<MermaidConfig>): void;

  /**
   * Reset the configuration to defaults
   */
  export function reset(): void;

  /**
   * Get the version of Mermaid
   */
  export const version: string;

  const mermaid: {
    initialize: typeof initialize;
    render: typeof render;
    parse: typeof parse;
    getConfig: typeof getConfig;
    updateConfig: typeof updateConfig;
    reset: typeof reset;
    version: string;
  };

  export default mermaid;
}

/**
 * Supported Mermaid diagram types
 */
export type MermaidDiagramType =
  | 'flowchart'
  | 'graph'
  | 'sequence'
  | 'sequenceDiagram'
  | 'class'
  | 'classDiagram'
  | 'state'
  | 'stateDiagram'
  | 'er'
  | 'erDiagram'
  | 'gantt'
  | 'pie'
  | 'journey'
  | 'gitGraph'
  | 'timeline'
  | 'mindmap'
  | 'quadrantChart'
  | 'requirement'
  | 'c4';

/**
 * Mermaid rendering error types
 */
export interface MermaidRenderError {
  /** Error message */
  message: string;

  /** Error type */
  type: 'syntax' | 'rendering' | 'timeout' | 'unknown';

  /** Original error object */
  originalError?: Error;

  /** Diagram text that caused the error */
  diagramText?: string;
}

/**
 * Props for Mermaid diagram components
 */
export interface MermaidDiagramProps {
  /** The mermaid diagram code */
  chart: string;

  /** Optional unique ID for the diagram */
  id?: string;

  /** Optional configuration overrides */
  config?: Partial<import('mermaid').MermaidConfig>;

  /** Callback when diagram renders successfully */
  onRender?: (svg: string) => void;

  /** Callback when rendering fails */
  onError?: (error: MermaidRenderError) => void;

  /** Optional CSS class name */
  className?: string;
}
