// Agent Dynamic Pages - Component Type Definitions

export interface ComponentLibraryItem {
  id: string;
  name: string;
  type: string;
  category: ComponentCategory;
  description: string;
  icon: string;
  preview: string;
  schema: ComponentSchema;
  defaultProps: Record<string, any>;
  examples: ComponentExample[];
  documentation: string;
  version: string;
  tags: string[];
}

export type ComponentCategory = 
  | 'layout'
  | 'input'
  | 'display'
  | 'navigation'
  | 'feedback'
  | 'data'
  | 'media'
  | 'custom';

export interface ComponentSchema {
  type: 'object';
  properties: Record<string, PropertySchema>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface PropertySchema {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  default?: any;
  enum?: any[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  items?: PropertySchema;
  properties?: Record<string, PropertySchema>;
}

export interface ComponentExample {
  name: string;
  description: string;
  props: Record<string, any>;
  code: string;
}

export interface CustomComponent {
  id: string;
  workspaceId: string;
  name: string;
  type: string;
  definition: ComponentDefinition;
  schema: ComponentSchema;
  version: string;
  status: 'active' | 'deprecated' | 'archived';
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface ComponentDefinition {
  render: string; // React component code
  props?: Record<string, any>;
  styles?: string; // CSS/SCSS code
  dependencies?: string[]; // External dependencies
  lifecycle?: {
    onMount?: string;
    onUnmount?: string;
    onUpdate?: string;
  };
}

export interface ComponentPaletteSection {
  category: ComponentCategory;
  title: string;
  components: ComponentLibraryItem[];
  collapsed?: boolean;
}

export interface DraggedComponent {
  type: string;
  source: 'library' | 'custom';
  component: ComponentLibraryItem | CustomComponent;
  preview?: string;
}

export interface DroppedComponent {
  component: DraggedComponent;
  position: {
    x: number;
    y: number;
  };
  target?: {
    containerId?: string;
    index?: number;
  };
}

export interface ComponentValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  sanitizedProps?: Record<string, any>;
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

export interface ComponentRenderContext {
  agentName: string;
  pageId: string;
  mode: 'edit' | 'preview' | 'published';
  theme: string;
  permissions: string[];
  variables: Record<string, any>;
}

export interface ComponentEvent {
  type: 'click' | 'hover' | 'change' | 'focus' | 'blur' | 'custom';
  handler: string;
  params?: Record<string, any>;
  conditions?: EventCondition[];
}

export interface EventCondition {
  field: string;
  operator: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'contains' | 'startsWith' | 'endsWith';
  value: any;
}

export interface ComponentState {
  [componentId: string]: {
    props: Record<string, any>;
    state: Record<string, any>;
    errors: ValidationError[];
    isDirty: boolean;
    lastUpdated: Date;
  };
}

export interface ComponentSelection {
  componentId: string;
  type: 'single' | 'multiple';
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  handles?: SelectionHandle[];
}

export interface SelectionHandle {
  type: 'resize' | 'rotate' | 'move';
  position: 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'center';
  cursor: string;
}

export interface ComponentClipboard {
  operation: 'copy' | 'cut';
  components: ComponentDefinition[];
  timestamp: Date;
}

export interface ComponentSearchFilter {
  category?: ComponentCategory;
  tags?: string[];
  searchTerm?: string;
  source?: 'library' | 'custom' | 'all';
}

export interface ComponentUsageStats {
  componentType: string;
  usageCount: number;
  lastUsed: Date;
  popularProps: Record<string, number>;
  averageRenderTime: number;
}