export interface PostTemplate {
  id: string;
  name: string;
  title: string;
  hook: string;
  content: string;
  tags: string[];
  category: TemplateCategory;
  description: string;
  icon?: string;
  color?: string;
  estimatedTime?: number; // in minutes
  popularity?: number;
  isPublic?: boolean;
  createdBy?: string;
  usageCount?: number;
  metadata?: TemplateMetadata;
}

export interface TemplateMetadata {
  businessImpact?: number;
  targetAudience?: string[];
  bestTimeToUse?: string[];
  relatedTemplates?: string[];
  keywords?: string[];
  contentStructure?: string[];
}

export enum TemplateCategory {
  UPDATE = 'update',
  INSIGHT = 'insight',
  QUESTION = 'question',
  ANNOUNCEMENT = 'announcement',
  CODE_REVIEW = 'code-review',
  MEETING_SUMMARY = 'meeting-summary',
  GOAL_SETTING = 'goal-setting',
  PROBLEM_SOLVING = 'problem-solving',
  CELEBRATION = 'celebration',
  REQUEST_HELP = 'request-help',
  BRAINSTORM = 'brainstorm',
  DECISION = 'decision',
  LEARNING = 'learning',
  PROCESS = 'process',
  FEEDBACK = 'feedback'
}

export interface TemplateLibrary {
  templates: PostTemplate[];
  categories: TemplateCategory[];
  popularTemplates: PostTemplate[];
  recentTemplates: PostTemplate[];
  customTemplates: PostTemplate[];
}

export interface TemplateContext {
  currentProject?: string;
  teamMembers?: string[];
  recentActivity?: string[];
  timeOfDay?: 'morning' | 'afternoon' | 'evening';
  dayOfWeek?: string;
  userRole?: string;
}

export interface TemplateSuggestion {
  template: PostTemplate;
  score: number;
  reason: string;
  context?: TemplateContext;
}