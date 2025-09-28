/**
 * Template System Types
 * Phase 3 - Production-ready types for template functionality
 */

export interface Template {
  id: string;
  name: string;
  description: string;
  content: string;
  category: TemplateCategory;
  tags: string[];
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  usageCount: number;
  rating?: number;
  variables?: TemplateVariable[];
}

export enum TemplateCategory {
  SOCIAL_MEDIA = 'social_media',
  BLOG_POST = 'blog_post',
  EMAIL = 'email',
  ANNOUNCEMENT = 'announcement',
  TUTORIAL = 'tutorial',
  REVIEW = 'review',
  CUSTOM = 'custom'
}

export interface TemplateVariable {
  name: string;
  type: TemplateVariableType;
  label: string;
  placeholder?: string;
  required: boolean;
  defaultValue?: string;
  options?: string[]; // For select/radio types
}

export enum TemplateVariableType {
  TEXT = 'text',
  TEXTAREA = 'textarea',
  SELECT = 'select',
  RADIO = 'radio',
  CHECKBOX = 'checkbox',
  DATE = 'date',
  NUMBER = 'number'
}

export interface TemplateCreateRequest {
  name: string;
  description: string;
  content: string;
  category: TemplateCategory;
  tags?: string[];
  isPublic?: boolean;
  variables?: TemplateVariable[];
}

export interface TemplateUpdateRequest {
  id: string;
  name?: string;
  description?: string;
  content?: string;
  category?: TemplateCategory;
  tags?: string[];
  isPublic?: boolean;
  variables?: TemplateVariable[];
}

export interface TemplateSearchFilters {
  category?: TemplateCategory;
  tags?: string[];
  isPublic?: boolean;
  searchText?: string;
  createdBy?: string;
}

export interface TemplateStats {
  totalTemplates: number;
  publicTemplates: number;
  privateTemplates: number;
  mostUsed: Template[];
  recentlyCreated: Template[];
}

export interface RenderedTemplate {
  content: string;
  variables: Record<string, any>;
}