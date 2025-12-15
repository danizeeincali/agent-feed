// Agent Dynamic Pages - Page Type Definitions

/**
 * Dynamic Page API Response Types for real data integration
 */
export interface DynamicPage {
  id: string;
  agent_id: string;
  title: string;
  description?: string;
  content_type: 'text' | 'markdown' | 'json' | 'component';
  content_value: string;
  page_type: 'persistent' | 'dynamic' | 'template';
  status: 'draft' | 'published' | 'archived';
  metadata?: Record<string, any>;
  version: number;
  created_at: string;
  updated_at: string;
  last_accessed?: string;
  access_count?: number;
}

export interface CreateDynamicPageRequest {
  title: string;
  description?: string;
  content_type: 'text' | 'markdown' | 'json' | 'component';
  content_value: string;
  page_type?: 'persistent' | 'dynamic' | 'template';
  status?: 'draft' | 'published' | 'archived';
  metadata?: Record<string, any>;
}

export interface UpdateDynamicPageRequest {
  title?: string;
  description?: string;
  content_type?: 'text' | 'markdown' | 'json' | 'component';
  content_value?: string;
  page_type?: 'persistent' | 'dynamic' | 'template';
  status?: 'draft' | 'published' | 'archived';
  metadata?: Record<string, any>;
}

export interface DynamicPageListResponse {
  success: boolean;
  agent_id: string;
  pages: DynamicPage[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
  error?: string;
}

export interface DynamicPageResponse {
  success: boolean;
  page: DynamicPage;
  error?: string;
}

export interface DynamicPageFilters {
  page_type?: string;
  status?: string;
  content_type?: string;
  search?: string;
  limit?: number;
  offset?: number;
  sort_by?: 'title' | 'created_at' | 'updated_at' | 'last_accessed';
  sort_order?: 'asc' | 'desc';
}

export interface PageManagerState {
  pages: DynamicPage[];
  isLoading: boolean;
  error: string | null;
  totalPages: number;
  hasMore: boolean;
  filters: DynamicPageFilters;
}

export interface PageOperationResult {
  success: boolean;
  page?: DynamicPage;
  error?: string;
}

/**
 * Legacy Page Builder Types (kept for compatibility)
 */
export interface PageDefinition {
  id: string;
  agentName: string;
  title: string;
  description: string;
  slug: string;
  layout: PageLayout;
  components: ComponentDefinition[];
  styles: PageStyles;
  metadata: PageMetadata;
  version: number;
  status: 'draft' | 'published' | 'archived';
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

export interface PageLayout {
  type: 'grid' | 'flexbox' | 'custom';
  columns?: number;
  rows?: number;
  gap: string;
  padding: string;
  maxWidth?: string;
  minHeight?: string;
}

export interface ComponentDefinition {
  id: string;
  type: string;
  source: 'library' | 'custom';
  props: Record<string, any>;
  position: ComponentPosition;
  children?: ComponentDefinition[];
  styles?: ComponentStyles;
  events?: ComponentEvents;
  validation?: ComponentValidation;
}

export interface ComponentPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex?: number;
  gridColumn?: string;
  gridRow?: string;
}

export interface ComponentStyles {
  className?: string;
  style?: React.CSSProperties;
  theme?: string;
  variant?: string;
}

export interface ComponentEvents {
  onClick?: string;
  onHover?: string;
  onChange?: string;
  onFocus?: string;
  onBlur?: string;
}

export interface ComponentValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  customValidator?: string;
}

export interface PageStyles {
  theme: string;
  customCSS?: string;
  variables?: Record<string, string>;
  fonts?: FontDefinition[];
  breakpoints?: BreakpointDefinition[];
}

export interface FontDefinition {
  name: string;
  url: string;
  fallback: string[];
}

export interface BreakpointDefinition {
  name: string;
  minWidth: number;
  maxWidth?: number;
}

export interface PageMetadata {
  tags: string[];
  category?: string;
  isPublic: boolean;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  socialImage?: string;
  lastEditedBy?: string;
  editHistory: EditHistoryEntry[];
}

export interface EditHistoryEntry {
  timestamp: Date;
  agentName: string;
  operation: string;
  summary: string;
  changes: Record<string, any>;
}

export interface PageVersion {
  id: string;
  pageId: string;
  versionNumber: number;
  content: PageDefinition;
  changeSummary: string;
  createdBy: string;
  createdAt: Date;
}

export interface CreatePageRequest {
  title: string;
  description?: string;
  slug?: string;
  layout: PageLayout;
  components?: ComponentDefinition[];
  styles?: Partial<PageStyles>;
  metadata?: Partial<PageMetadata>;
}

export interface UpdatePageRequest {
  title?: string;
  description?: string;
  slug?: string;
  layout?: PageLayout;
  components?: ComponentDefinition[];
  styles?: Partial<PageStyles>;
  metadata?: Partial<PageMetadata>;
}

export interface PageResponse {
  success: boolean;
  page?: PageDefinition;
  securityContext?: SecurityContext;
  renderedComponents?: RenderedComponent[];
  error?: string;
  violations?: string[];
}

export interface PageListResponse {
  success: boolean;
  pages?: PageDefinition[];
  total?: number;
  page?: number;
  limit?: number;
  error?: string;
}

export interface PublishPageRequest {
  publishSettings?: {
    makePublic?: boolean;
    enableComments?: boolean;
    enableSharing?: boolean;
    customUrl?: string;
  };
}

export interface SecurityContext {
  agentName: string;
  permissions: string[];
  restrictions: string[];
  allowedComponents: string[];
  quotas: {
    maxComponents: number;
    maxFileSize: number;
    maxCustomCSS: number;
  };
}

export interface RenderedComponent {
  id: string;
  type: string;
  source: 'library' | 'custom';
  props: Record<string, any>;
  children?: RenderedComponent[];
  position: ComponentPosition;
  styles?: ComponentStyles;
  isSecure: boolean;
  securityViolations?: string[];
  renderTime?: number;
  metadata?: {
    renderTime: Date;
    version: string;
  };
}