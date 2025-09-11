// Agent Customization Components - Phase 3 Dynamic Agent Pages
// Export all customization-related components and utilities

// Main Components
export { default as AgentCustomizationInterface } from './AgentCustomizationInterface';
export type { CustomizationSettings } from './AgentCustomizationInterface';

export { default as ThemeCustomizer } from './ThemeCustomizer';
export type { ThemeSettings } from './ThemeCustomizer';

export { default as WidgetConfiguration } from './WidgetConfiguration';
export type { WidgetConfig, WidgetTemplate } from './WidgetConfiguration';

export { default as PrivacySettings } from './PrivacySettings';
export type { PrivacySettings as PrivacySettingsType } from './PrivacySettings';

export { default as ProfileSettingsManager } from './ProfileSettingsManager';
export type { ProfileSettings } from './ProfileSettingsManager';

export { default as CustomizationDemo } from './CustomizationDemo';

// Hooks and Utilities
export { useAgentCustomization } from '@/hooks/useAgentCustomization';

// API and Validation
export { agentCustomizationAPI } from '@/api/agentCustomization';
export { 
  validateAllSettings,
  validateProfileSettings,
  validateThemeSettings,
  validateWidgetSettings,
  validatePrivacySettings,
  ValidationResult,
  type ValidationError,
  type ValidationRule
} from '@/utils/validation';

// Constants and Defaults
export const CUSTOMIZATION_CONSTANTS = {
  MAX_WIDGETS: 12,
  MIN_REFRESH_INTERVAL: 5,
  MAX_NAME_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 1000,
  MAX_WELCOME_MESSAGE_LENGTH: 500,
  
  DEFAULT_COLORS: [
    '#3b82f6', '#8b5cf6', '#ef4444', '#10b981', '#f59e0b',
    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
  ],
  
  FONT_FAMILIES: ['system', 'serif', 'mono', 'rounded'] as const,
  LAYOUT_OPTIONS: ['grid', 'list', 'masonry', 'cards'] as const,
  CORNER_RADIUS_OPTIONS: ['none', 'small', 'medium', 'large', 'full'] as const,
  
  PRIVACY_LEVELS: ['public', 'restricted', 'private'] as const,
  
  VALIDATION_RULES: {
    profile: {
      name: { required: true, minLength: 2, maxLength: 100 },
      description: { required: true, minLength: 10, maxLength: 1000 },
      specialization: { required: false, maxLength: 200 },
      welcomeMessage: { required: false, maxLength: 500 }
    },
    theme: {
      primaryColor: { required: true, pattern: /^#[0-9A-F]{6}$/i },
      accentColor: { required: true, pattern: /^#[0-9A-F]{6}$/i }
    },
    widgets: {
      maxCount: 12,
      minRefreshInterval: 5
    }
  }
};

// Helper Functions
export const createDefaultCustomizationSettings = (agentId?: string): CustomizationSettings => ({
  profile: {
    name: 'AI Assistant Agent',
    description: 'A versatile AI agent designed to help users accomplish tasks efficiently.',
    specialization: 'Multi-domain AI assistant',
    welcomeMessage: 'Welcome to my AI workspace! I\'m here to help you accomplish your goals.',
    avatar: '🤖'
  },
  theme: {
    primaryColor: '#3b82f6',
    accentColor: '#8b5cf6',
    backgroundStyle: 'gradient',
    layout: 'grid',
    fontFamily: 'system',
    cornerRadius: 'medium'
  },
  widgets: {
    enabled: [],
    layout: {},
    refreshIntervals: {}
  },
  privacy: {
    isPublic: true,
    allowComments: true,
    showMetrics: true,
    showActivity: true,
    showCapabilities: true,
    allowDataExport: true
  },
  content: {
    customSections: [],
    socialLinks: [],
    tags: []
  }
});

export const createDefaultThemeSettings = (): ThemeSettings => ({
  primaryColor: '#3b82f6',
  secondaryColor: '#1e40af',
  accentColor: '#8b5cf6',
  backgroundColor: '#ffffff',
  textColor: '#1f2937',
  borderColor: '#e2e8f0',
  fontFamily: 'system',
  fontSize: 'medium',
  fontWeight: 'normal',
  lineHeight: 'normal',
  layout: 'grid',
  spacing: 'normal',
  borderRadius: 'medium',
  shadows: 'medium',
  animations: 'smooth',
  glassmorphism: false,
  gradientBg: false,
  darkMode: 'light'
});

export const createDefaultPrivacySettings = (): PrivacySettingsType => ({
  profileVisibility: 'public',
  allowDirectContact: true,
  showLastActive: true,
  showOnlineStatus: true,
  allowComments: true,
  moderateComments: false,
  allowSharing: true,
  allowEmbedding: false,
  showPerformanceMetrics: true,
  showActivityFeed: true,
  showCapabilities: true,
  shareAnalytics: false,
  allowDataExport: true,
  dataRetentionDays: 365,
  anonymizeOldData: true,
  allowDataDeletion: true,
  enableAPIAccess: false,
  allowThirdPartyIntegrations: false,
  shareUsageStats: false,
  notifyOnProfileView: false,
  notifyOnMentions: true,
  notifyOnComments: true,
  notifyOnDataExport: true,
  requireAuthentication: false,
  enableTwoFactor: false,
  logAccessAttempts: true,
  sessionTimeout: 30,
  gdprCompliant: true,
  ccpaCompliant: false,
  dataProcessingConsent: true,
  marketingConsent: false
});

// Theme Utilities
export const applyThemeToElement = (element: HTMLElement, theme: ThemeSettings): void => {
  if (!element) return;

  element.style.setProperty('--primary-color', theme.primaryColor);
  element.style.setProperty('--secondary-color', theme.secondaryColor);
  element.style.setProperty('--accent-color', theme.accentColor);
  element.style.setProperty('--background-color', theme.backgroundColor);
  element.style.setProperty('--text-color', theme.textColor);
  element.style.setProperty('--border-color', theme.borderColor);

  element.style.fontFamily = theme.fontFamily === 'system' ? 'system-ui' :
                           theme.fontFamily === 'serif' ? 'Georgia, serif' :
                           theme.fontFamily === 'mono' ? 'ui-monospace, monospace' :
                           'ui-rounded, system-ui';

  element.style.fontSize = theme.fontSize === 'small' ? '14px' :
                          theme.fontSize === 'large' ? '18px' : '16px';

  element.style.fontWeight = theme.fontWeight === 'light' ? '300' :
                            theme.fontWeight === 'medium' ? '500' :
                            theme.fontWeight === 'bold' ? '700' : '400';

  element.style.lineHeight = theme.lineHeight === 'tight' ? '1.25' :
                            theme.lineHeight === 'relaxed' ? '1.75' : '1.5';

  const borderRadius = theme.borderRadius === 'none' ? '0' :
                       theme.borderRadius === 'small' ? '0.125rem' :
                       theme.borderRadius === 'large' ? '0.5rem' :
                       theme.borderRadius === 'full' ? '9999px' : '0.375rem';
  element.style.borderRadius = borderRadius;
};

export const generateThemeCSS = (theme: ThemeSettings): string => {
  return `
    :root {
      --primary-color: ${theme.primaryColor};
      --secondary-color: ${theme.secondaryColor};
      --accent-color: ${theme.accentColor};
      --background-color: ${theme.backgroundColor};
      --text-color: ${theme.textColor};
      --border-color: ${theme.borderColor};
    }

    .agent-theme {
      font-family: ${
        theme.fontFamily === 'system' ? 'system-ui' :
        theme.fontFamily === 'serif' ? 'Georgia, serif' :
        theme.fontFamily === 'mono' ? 'ui-monospace, monospace' :
        'ui-rounded, system-ui'
      };
      font-size: ${
        theme.fontSize === 'small' ? '14px' :
        theme.fontSize === 'large' ? '18px' : '16px'
      };
      font-weight: ${
        theme.fontWeight === 'light' ? '300' :
        theme.fontWeight === 'medium' ? '500' :
        theme.fontWeight === 'bold' ? '700' : '400'
      };
      line-height: ${
        theme.lineHeight === 'tight' ? '1.25' :
        theme.lineHeight === 'relaxed' ? '1.75' : '1.5'
      };
      background-color: var(--background-color);
      color: var(--text-color);
    }

    .agent-theme .border {
      border-color: var(--border-color);
    }

    .agent-theme .bg-primary {
      background-color: var(--primary-color);
    }

    .agent-theme .bg-secondary {
      background-color: var(--secondary-color);
    }

    .agent-theme .bg-accent {
      background-color: var(--accent-color);
    }

    .agent-theme .text-primary {
      color: var(--primary-color);
    }

    .agent-theme .text-secondary {
      color: var(--secondary-color);
    }

    .agent-theme .text-accent {
      color: var(--accent-color);
    }

    ${theme.gradientBg ? `
    .agent-theme .gradient-bg {
      background: linear-gradient(135deg, var(--primary-color), var(--accent-color));
    }
    ` : ''}

    ${theme.glassmorphism ? `
    .agent-theme .glassmorphism {
      backdrop-filter: blur(10px);
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
    ` : ''}

    ${theme.customCSS || ''}
  `;
};

// Widget Utilities
export const getWidgetIcon = (type: string) => {
  const iconMap: Record<string, any> = {
    metric: '📊',
    chart: '📈', 
    activity: '🔥',
    'quick-action': '⚡',
    custom: '🎨'
  };
  return iconMap[type] || '📋';
};

export const getWidgetDefaultSize = (type: string): { w: number; h: number } => {
  const sizeMap: Record<string, { w: number; h: number }> = {
    metric: { w: 2, h: 1 },
    chart: { w: 4, h: 2 },
    activity: { w: 3, h: 2 },
    'quick-action': { w: 2, h: 1 },
    custom: { w: 3, h: 2 }
  };
  return sizeMap[type] || { w: 2, h: 1 };
};

// Privacy Utilities
export const getPrivacyScore = (privacy: PrivacySettingsType): number => {
  let score = 0;
  const maxScore = 10;

  if (privacy.profileVisibility !== 'public') score += 1;
  if (!privacy.allowDirectContact) score += 1;
  if (!privacy.showLastActive) score += 1;
  if (!privacy.showOnlineStatus) score += 1;
  if (privacy.moderateComments) score += 1;
  if (!privacy.allowSharing) score += 1;
  if (!privacy.showPerformanceMetrics) score += 1;
  if (privacy.requireAuthentication) score += 1;
  if (privacy.enableTwoFactor) score += 1;
  if (privacy.logAccessAttempts) score += 1;

  return (score / maxScore) * 100;
};

export const getPrivacyLevel = (privacy: PrivacySettingsType): 'low' | 'medium' | 'high' => {
  const score = getPrivacyScore(privacy);
  if (score >= 80) return 'high';
  if (score >= 60) return 'medium';
  return 'low';
};

// Export Types for TypeScript users
export type {
  CustomizationSettings,
  ThemeSettings,
  WidgetConfig,
  WidgetTemplate,
  PrivacySettingsType,
  ProfileSettings,
  ValidationError,
  ValidationRule
};