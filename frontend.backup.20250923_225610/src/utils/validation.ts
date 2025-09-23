// Validation utilities for agent customization

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  min?: number;
  max?: number;
  custom?: (value: any) => string | null;
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  code?: string;
}

export class ValidationResult {
  private _errors: ValidationError[] = [];
  private _warnings: ValidationError[] = [];
  private _info: ValidationError[] = [];

  get errors(): ValidationError[] { return this._errors; }
  get warnings(): ValidationError[] { return this._warnings; }
  get info(): ValidationError[] { return this._info; }
  get all(): ValidationError[] { return [...this._errors, ...this._warnings, ...this._info]; }
  
  get isValid(): boolean { return this._errors.length === 0; }
  get hasWarnings(): boolean { return this._warnings.length > 0; }
  get hasInfo(): boolean { return this._info.length > 0; }

  addError(field: string, message: string, code?: string): void {
    this._errors.push({ field, message, severity: 'error', code });
  }

  addWarning(field: string, message: string, code?: string): void {
    this._warnings.push({ field, message, severity: 'warning', code });
  }

  addInfo(field: string, message: string, code?: string): void {
    this._info.push({ field, message, severity: 'info', code });
  }

  merge(other: ValidationResult): ValidationResult {
    const result = new ValidationResult();
    result._errors = [...this._errors, ...other._errors];
    result._warnings = [...this._warnings, ...other._warnings];
    result._info = [...this._info, ...other._info];
    return result;
  }
}

export const validateField = (
  value: any,
  rules: ValidationRule,
  fieldName: string
): ValidationError[] => {
  const errors: ValidationError[] = [];

  // Required validation
  if (rules.required && (value === undefined || value === null || value === '')) {
    errors.push({
      field: fieldName,
      message: `${fieldName} is required`,
      severity: 'error',
      code: 'REQUIRED'
    });
    return errors; // Return early if required field is empty
  }

  // Skip other validations if value is empty and not required
  if (value === undefined || value === null || value === '') {
    return errors;
  }

  // String length validations
  if (typeof value === 'string') {
    if (rules.minLength && value.length < rules.minLength) {
      errors.push({
        field: fieldName,
        message: `${fieldName} must be at least ${rules.minLength} characters long`,
        severity: 'error',
        code: 'MIN_LENGTH'
      });
    }

    if (rules.maxLength && value.length > rules.maxLength) {
      errors.push({
        field: fieldName,
        message: `${fieldName} must be no more than ${rules.maxLength} characters long`,
        severity: 'error',
        code: 'MAX_LENGTH'
      });
    }

    // Pattern validation
    if (rules.pattern && !rules.pattern.test(value)) {
      errors.push({
        field: fieldName,
        message: `${fieldName} format is invalid`,
        severity: 'error',
        code: 'PATTERN'
      });
    }
  }

  // Numeric validations
  if (typeof value === 'number') {
    if (rules.min !== undefined && value < rules.min) {
      errors.push({
        field: fieldName,
        message: `${fieldName} must be at least ${rules.min}`,
        severity: 'error',
        code: 'MIN_VALUE'
      });
    }

    if (rules.max !== undefined && value > rules.max) {
      errors.push({
        field: fieldName,
        message: `${fieldName} must be no more than ${rules.max}`,
        severity: 'error',
        code: 'MAX_VALUE'
      });
    }
  }

  // Custom validation
  if (rules.custom) {
    const customError = rules.custom(value);
    if (customError) {
      errors.push({
        field: fieldName,
        message: customError,
        severity: 'error',
        code: 'CUSTOM'
      });
    }
  }

  return errors;
};

export const validateProfileSettings = (profile: any): ValidationResult => {
  const result = new ValidationResult();

  // Profile name validation
  const nameErrors = validateField(profile.name, {
    required: true,
    minLength: 2,
    maxLength: 100,
    pattern: /^[a-zA-Z0-9\s\-_'.]+$/,
    custom: (value) => {
      if (typeof value === 'string' && value.trim() !== value) {
        return 'Name cannot have leading or trailing spaces';
      }
      if (typeof value === 'string' && /\s{2,}/.test(value)) {
        return 'Name cannot have multiple consecutive spaces';
      }
      return null;
    }
  }, 'Profile Name');
  nameErrors.forEach(error => result.addError(error.field, error.message, error.code));

  // Description validation
  const descriptionErrors = validateField(profile.description, {
    required: true,
    minLength: 10,
    maxLength: 1000
  }, 'Description');
  descriptionErrors.forEach(error => result.addError(error.field, error.message, error.code));

  // Specialization validation
  const specializationErrors = validateField(profile.specialization, {
    required: false,
    maxLength: 200
  }, 'Specialization');
  specializationErrors.forEach(error => result.addError(error.field, error.message, error.code));

  // Welcome message validation
  const welcomeErrors = validateField(profile.welcomeMessage, {
    required: false,
    maxLength: 500
  }, 'Welcome Message');
  welcomeErrors.forEach(error => result.addError(error.field, error.message, error.code));

  // Avatar validation
  if (profile.avatar && typeof profile.avatar === 'string') {
    if (profile.avatar.length > 4) {
      result.addError('Avatar', 'Avatar should be a single emoji or short symbol', 'AVATAR_LENGTH');
    }
  }

  return result;
};

export const validateThemeSettings = (theme: any): ValidationResult => {
  const result = new ValidationResult();

  const colorPattern = /^#[0-9A-F]{6}$/i;

  // Primary color validation
  const primaryColorErrors = validateField(theme.primaryColor, {
    required: true,
    pattern: colorPattern
  }, 'Primary Color');
  primaryColorErrors.forEach(error => result.addError(error.field, error.message, error.code));

  // Secondary color validation
  const secondaryColorErrors = validateField(theme.secondaryColor, {
    required: true,
    pattern: colorPattern
  }, 'Secondary Color');
  secondaryColorErrors.forEach(error => result.addError(error.field, error.message, error.code));

  // Accent color validation
  const accentColorErrors = validateField(theme.accentColor, {
    required: true,
    pattern: colorPattern
  }, 'Accent Color');
  accentColorErrors.forEach(error => result.addError(error.field, error.message, error.code));

  // Color contrast validation
  if (theme.primaryColor && theme.backgroundColor) {
    const contrast = calculateContrast(theme.primaryColor, theme.backgroundColor);
    if (contrast < 3) {
      result.addWarning('Theme Colors', 'Low contrast between primary color and background may affect readability', 'LOW_CONTRAST');
    }
  }

  // Font size validation
  if (theme.fontSize && !['small', 'medium', 'large'].includes(theme.fontSize)) {
    result.addError('Font Size', 'Invalid font size option', 'INVALID_FONT_SIZE');
  }

  return result;
};

export const validateWidgetSettings = (widgets: any[], maxCount: number = 12): ValidationResult => {
  const result = new ValidationResult();

  // Widget count validation
  if (widgets.length > maxCount) {
    result.addError('Widgets', `Maximum ${maxCount} widgets allowed`, 'MAX_WIDGETS');
  }

  // Individual widget validation
  widgets.forEach((widget, index) => {
    const fieldPrefix = `Widget ${index + 1}`;

    // Title validation
    const titleErrors = validateField(widget.title, {
      required: true,
      minLength: 1,
      maxLength: 50
    }, `${fieldPrefix} Title`);
    titleErrors.forEach(error => result.addError(error.field, error.message, error.code));

    // Position validation
    if (widget.position) {
      if (widget.position.w < 1 || widget.position.w > 6) {
        result.addError(`${fieldPrefix} Width`, 'Widget width must be between 1 and 6', 'INVALID_WIDTH');
      }
      if (widget.position.h < 1 || widget.position.h > 6) {
        result.addError(`${fieldPrefix} Height`, 'Widget height must be between 1 and 6', 'INVALID_HEIGHT');
      }
    }

    // Refresh interval validation
    if (widget.refreshInterval !== undefined) {
      if (widget.refreshInterval > 0 && widget.refreshInterval < 5) {
        result.addWarning(`${fieldPrefix} Refresh`, 'Refresh intervals under 5 seconds may impact performance', 'FAST_REFRESH');
      }
      if (widget.refreshInterval > 3600) {
        result.addWarning(`${fieldPrefix} Refresh`, 'Refresh intervals over 1 hour may show stale data', 'SLOW_REFRESH');
      }
    }
  });

  // Check for duplicate widget IDs
  const widgetIds = widgets.map(w => w.id).filter(Boolean);
  const duplicateIds = widgetIds.filter((id, index) => widgetIds.indexOf(id) !== index);
  if (duplicateIds.length > 0) {
    result.addError('Widget IDs', 'Duplicate widget IDs found', 'DUPLICATE_IDS');
  }

  return result;
};

export const validatePrivacySettings = (privacy: any): ValidationResult => {
  const result = new ValidationResult();

  // Data retention validation
  if (privacy.dataRetentionDays !== undefined) {
    if (privacy.dataRetentionDays !== -1 && privacy.dataRetentionDays < 1) {
      result.addError('Data Retention', 'Data retention period must be at least 1 day or -1 for forever', 'INVALID_RETENTION');
    }
    if (privacy.dataRetentionDays > 0 && privacy.dataRetentionDays < 30) {
      result.addWarning('Data Retention', 'Short retention periods may not comply with some regulations', 'SHORT_RETENTION');
    }
  }

  // Session timeout validation
  if (privacy.sessionTimeout !== undefined) {
    if (privacy.sessionTimeout !== -1 && privacy.sessionTimeout < 5) {
      result.addWarning('Session Timeout', 'Very short session timeouts may impact user experience', 'SHORT_SESSION');
    }
  }

  // Compliance checks
  if (privacy.profileVisibility === 'public' && !privacy.gdprCompliant) {
    result.addWarning('GDPR Compliance', 'Public profiles should be GDPR compliant', 'GDPR_WARNING');
  }

  if (privacy.allowDataExport === false && privacy.gdprCompliant) {
    result.addError('Data Export', 'GDPR compliance requires allowing data export', 'GDPR_EXPORT');
  }

  return result;
};

// Helper function to calculate color contrast ratio
function calculateContrast(color1: string, color2: string): number {
  // Simple contrast calculation (for demo purposes)
  // In a real implementation, you'd use proper color space calculations
  const hex1 = color1.replace('#', '');
  const hex2 = color2.replace('#', '');
  
  const r1 = parseInt(hex1.substr(0, 2), 16);
  const g1 = parseInt(hex1.substr(2, 2), 16);
  const b1 = parseInt(hex1.substr(4, 2), 16);
  
  const r2 = parseInt(hex2.substr(0, 2), 16);
  const g2 = parseInt(hex2.substr(2, 2), 16);
  const b2 = parseInt(hex2.substr(4, 2), 16);
  
  const brightness1 = (r1 * 299 + g1 * 587 + b1 * 114) / 1000;
  const brightness2 = (r2 * 299 + g2 * 587 + b2 * 114) / 1000;
  
  return Math.abs(brightness1 - brightness2) / 255 * 21;
}

export const validateAllSettings = (settings: any): ValidationResult => {
  let result = new ValidationResult();

  if (settings.customization?.profile) {
    result = result.merge(validateProfileSettings(settings.customization.profile));
  }

  if (settings.theme) {
    result = result.merge(validateThemeSettings(settings.theme));
  }

  if (settings.widgets) {
    result = result.merge(validateWidgetSettings(settings.widgets));
  }

  if (settings.privacy) {
    result = result.merge(validatePrivacySettings(settings.privacy));
  }

  return result;
};

/**
 * Format numbers for display
 */
export const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

/**
 * Calculate time difference for display
 */
export const getRelativeTime = (timestamp: string | Date): string => {
  const now = new Date();
  const time = new Date(timestamp);
  const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000);

  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
  return `${Math.floor(diffInSeconds / 31536000)}y ago`;
};

/**
 * Generate a random color for avatars
 */
export const generateAvatarColor = (id: string): string => {
  const colors = [
    '#3B82F6', // Blue
    '#8B5CF6', // Purple
    '#10B981', // Emerald
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#06B6D4', // Cyan
    '#84CC16', // Lime
    '#F97316', // Orange
    '#EC4899', // Pink
    '#6366F1'  // Indigo
  ];
  
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
};