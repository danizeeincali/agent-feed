/**
 * AviConfigurationManager - Centralized Configuration Management for Avi Integration
 *
 * This service manages all configuration aspects for Avi DM Claude instances,
 * including user preferences, system settings, personality profiles,
 * security configurations, and environment-specific settings.
 *
 * Features:
 * - Environment-based configuration loading
 * - Runtime configuration updates
 * - Configuration validation and schema enforcement
 * - Secure storage of sensitive configuration
 * - Configuration versioning and migration
 * - Profile management and templates
 */

import { EventEmitter } from 'events';
import {
  AviInstanceConfig,
  AviUserPreferences,
  AviPersonalityMode,
  AviSecurityContext,
  AviError
} from '../types/avi-integration';

interface AviSystemConfig {
  environment: 'development' | 'staging' | 'production';
  apiBaseUrl: string;
  websocketUrl: string;
  version: string;
  features: {
    voiceInput: boolean;
    imageUpload: boolean;
    analytics: boolean;
    encryption: boolean;
    contextRetention: boolean;
    personalityAdaptation: boolean;
  };
  limits: {
    maxMessageLength: number;
    maxImageSize: number;
    maxConversationHistory: number;
    maxConcurrentInstances: number;
    rateLimit: {
      messages: number;
      images: number;
      windowMs: number;
    };
  };
  security: {
    encryptionRequired: boolean;
    tokenExpirationMs: number;
    maxLoginAttempts: number;
    sessionTimeoutMs: number;
    auditLogging: boolean;
  };
  performance: {
    connectionTimeout: number;
    responseTimeout: number;
    heartbeatInterval: number;
    reconnectAttempts: number;
    prefetchEnabled: boolean;
  };
}

interface AviPersonalityProfile {
  id: string;
  name: string;
  mode: AviPersonalityMode;
  description: string;
  settings: {
    responseStyle: 'concise' | 'detailed' | 'interactive';
    formalityLevel: 'casual' | 'professional' | 'formal';
    emotionalTone: 'neutral' | 'warm' | 'enthusiastic' | 'supportive';
    technicalDepth: 'basic' | 'intermediate' | 'advanced' | 'expert';
    adaptationSpeed: 'slow' | 'moderate' | 'fast';
    contextSensitivity: 'low' | 'medium' | 'high';
  };
  customPrompts?: {
    greeting?: string;
    farewell?: string;
    clarification?: string;
    encouragement?: string;
  };
  restrictions?: string[];
  isDefault?: boolean;
}

interface ConfigurationTemplate {
  id: string;
  name: string;
  description: string;
  category: 'general' | 'business' | 'education' | 'support' | 'creative';
  config: Partial<AviInstanceConfig>;
  userPreferences: Partial<AviUserPreferences>;
  personalityProfile: string; // Profile ID
  tags: string[];
}

interface ConfigurationSchema {
  version: string;
  definitions: {
    [key: string]: {
      type: string;
      properties?: any;
      required?: string[];
      enum?: any[];
      minimum?: number;
      maximum?: number;
      pattern?: string;
    };
  };
}

/**
 * Centralized configuration management for Avi instances
 */
export class AviConfigurationManager extends EventEmitter {
  private systemConfig: AviSystemConfig;
  private personalityProfiles: Map<string, AviPersonalityProfile> = new Map();
  private configurationTemplates: Map<string, ConfigurationTemplate> = new Map();
  private userConfigurations: Map<string, AviInstanceConfig> = new Map();
  private configurationSchema: ConfigurationSchema;

  // Storage and persistence
  private storagePrefix = 'avi-config';
  private encryptionKey: string | null = null;

  // Configuration validation
  private validator: ConfigurationValidator;

  // Migration support
  private currentVersion = '1.0.0';
  private migrationHandlers: Map<string, (config: any) => any> = new Map();

  constructor() {
    super();

    this.validator = new ConfigurationValidator();
    this.loadSystemConfiguration();
    this.loadConfigurationSchema();
    this.initializeDefaultProfiles();
    this.initializeDefaultTemplates();
    this.setupMigrationHandlers();
  }

  /**
   * Get system configuration
   */
  getSystemConfig(): AviSystemConfig {
    return { ...this.systemConfig };
  }

  /**
   * Update system configuration
   */
  async updateSystemConfig(updates: Partial<AviSystemConfig>): Promise<void> {
    const newConfig = { ...this.systemConfig, ...updates };

    // Validate configuration
    if (!this.validator.validateSystemConfig(newConfig)) {
      throw new AviError('Invalid system configuration', 'VALIDATION_ERROR');
    }

    this.systemConfig = newConfig;
    await this.persistSystemConfig();

    this.emit('system_config:updated', newConfig);
  }

  /**
   * Create instance configuration from template
   */
  createInstanceConfig(templateId?: string, overrides?: Partial<AviInstanceConfig>): AviInstanceConfig {
    let baseConfig: Partial<AviInstanceConfig> = {
      id: `avi-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: 'Avi Assistant',
      description: 'AI-powered direct message assistant',
      aviUserId: '',
      aviSessionId: '',
      dmChannelId: '',
      personalityMode: 'adaptive',
      responseLatency: 'natural',
      privacyLevel: 'standard',
      contextRetention: 'session'
    };

    // Apply template if provided
    if (templateId) {
      const template = this.configurationTemplates.get(templateId);
      if (template) {
        baseConfig = { ...baseConfig, ...template.config };
      }
    }

    // Apply overrides
    if (overrides) {
      baseConfig = { ...baseConfig, ...overrides };
    }

    // Validate final configuration
    const finalConfig = baseConfig as AviInstanceConfig;
    if (!this.validator.validateInstanceConfig(finalConfig)) {
      throw new AviError('Invalid instance configuration', 'VALIDATION_ERROR');
    }

    return finalConfig;
  }

  /**
   * Get personality profile by ID or mode
   */
  getPersonalityProfile(identifier: string | AviPersonalityMode): AviPersonalityProfile | null {
    // Try by ID first
    if (this.personalityProfiles.has(identifier)) {
      return { ...this.personalityProfiles.get(identifier)! };
    }

    // Try by mode
    for (const profile of this.personalityProfiles.values()) {
      if (profile.mode === identifier) {
        return { ...profile };
      }
    }

    return null;
  }

  /**
   * Get all personality profiles
   */
  getAllPersonalityProfiles(): AviPersonalityProfile[] {
    return Array.from(this.personalityProfiles.values()).map(profile => ({ ...profile }));
  }

  /**
   * Create or update personality profile
   */
  async setPersonalityProfile(profile: AviPersonalityProfile): Promise<void> {
    // Validate profile
    if (!this.validator.validatePersonalityProfile(profile)) {
      throw new AviError('Invalid personality profile', 'VALIDATION_ERROR');
    }

    this.personalityProfiles.set(profile.id, { ...profile });
    await this.persistPersonalityProfiles();

    this.emit('personality_profile:updated', profile);
  }

  /**
   * Delete personality profile
   */
  async deletePersonalityProfile(profileId: string): Promise<void> {
    const profile = this.personalityProfiles.get(profileId);
    if (!profile) {
      throw new AviError('Profile not found', 'VALIDATION_ERROR');
    }

    if (profile.isDefault) {
      throw new AviError('Cannot delete default profile', 'VALIDATION_ERROR');
    }

    this.personalityProfiles.delete(profileId);
    await this.persistPersonalityProfiles();

    this.emit('personality_profile:deleted', profileId);
  }

  /**
   * Get configuration template by ID
   */
  getConfigurationTemplate(templateId: string): ConfigurationTemplate | null {
    const template = this.configurationTemplates.get(templateId);
    return template ? { ...template } : null;
  }

  /**
   * Get all configuration templates
   */
  getAllConfigurationTemplates(): ConfigurationTemplate[] {
    return Array.from(this.configurationTemplates.values()).map(template => ({ ...template }));
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(category: ConfigurationTemplate['category']): ConfigurationTemplate[] {
    return Array.from(this.configurationTemplates.values())
      .filter(template => template.category === category)
      .map(template => ({ ...template }));
  }

  /**
   * Create or update configuration template
   */
  async setConfigurationTemplate(template: ConfigurationTemplate): Promise<void> {
    // Validate template
    if (!this.validator.validateConfigurationTemplate(template)) {
      throw new AviError('Invalid configuration template', 'VALIDATION_ERROR');
    }

    this.configurationTemplates.set(template.id, { ...template });
    await this.persistConfigurationTemplates();

    this.emit('configuration_template:updated', template);
  }

  /**
   * Delete configuration template
   */
  async deleteConfigurationTemplate(templateId: string): Promise<void> {
    if (!this.configurationTemplates.has(templateId)) {
      throw new AviError('Template not found', 'VALIDATION_ERROR');
    }

    this.configurationTemplates.delete(templateId);
    await this.persistConfigurationTemplates();

    this.emit('configuration_template:deleted', templateId);
  }

  /**
   * Validate configuration against schema
   */
  validateConfiguration(config: any, type: 'system' | 'instance' | 'personality' | 'template'): boolean {
    switch (type) {
      case 'system':
        return this.validator.validateSystemConfig(config);
      case 'instance':
        return this.validator.validateInstanceConfig(config);
      case 'personality':
        return this.validator.validatePersonalityProfile(config);
      case 'template':
        return this.validator.validateConfigurationTemplate(config);
      default:
        return false;
    }
  }

  /**
   * Get configuration for specific user
   */
  getUserConfiguration(userId: string): AviInstanceConfig | null {
    const config = this.userConfigurations.get(userId);
    return config ? { ...config } : null;
  }

  /**
   * Set configuration for specific user
   */
  async setUserConfiguration(userId: string, config: AviInstanceConfig): Promise<void> {
    if (!this.validator.validateInstanceConfig(config)) {
      throw new AviError('Invalid user configuration', 'VALIDATION_ERROR');
    }

    this.userConfigurations.set(userId, { ...config });
    await this.persistUserConfiguration(userId, config);

    this.emit('user_configuration:updated', { userId, config });
  }

  /**
   * Export configuration as JSON
   */
  exportConfiguration(): any {
    return {
      version: this.currentVersion,
      timestamp: new Date().toISOString(),
      systemConfig: this.systemConfig,
      personalityProfiles: Object.fromEntries(this.personalityProfiles),
      configurationTemplates: Object.fromEntries(this.configurationTemplates),
      userConfigurations: Object.fromEntries(this.userConfigurations)
    };
  }

  /**
   * Import configuration from JSON
   */
  async importConfiguration(configData: any): Promise<void> {
    // Validate imported data
    if (!configData.version) {
      throw new AviError('Invalid configuration format', 'VALIDATION_ERROR');
    }

    // Check if migration is needed
    if (configData.version !== this.currentVersion) {
      configData = await this.migrateConfiguration(configData);
    }

    // Import system config
    if (configData.systemConfig) {
      await this.updateSystemConfig(configData.systemConfig);
    }

    // Import personality profiles
    if (configData.personalityProfiles) {
      for (const [id, profile] of Object.entries(configData.personalityProfiles)) {
        await this.setPersonalityProfile(profile as AviPersonalityProfile);
      }
    }

    // Import configuration templates
    if (configData.configurationTemplates) {
      for (const [id, template] of Object.entries(configData.configurationTemplates)) {
        await this.setConfigurationTemplate(template as ConfigurationTemplate);
      }
    }

    this.emit('configuration:imported', configData);
  }

  /**
   * Reset to default configuration
   */
  async resetToDefaults(): Promise<void> {
    this.loadSystemConfiguration();
    this.personalityProfiles.clear();
    this.configurationTemplates.clear();
    this.userConfigurations.clear();

    this.initializeDefaultProfiles();
    this.initializeDefaultTemplates();

    await this.persistAllConfigurations();

    this.emit('configuration:reset');
  }

  // Private methods

  private loadSystemConfiguration(): void {
    // Load environment-specific configuration
    const environment = process.env.NODE_ENV as 'development' | 'staging' | 'production' || 'development';

    this.systemConfig = {
      environment,
      apiBaseUrl: process.env.AVI_API_BASE_URL || 'http://localhost:3002',
      websocketUrl: process.env.AVI_WEBSOCKET_URL || 'ws://localhost:3002/avi-websocket',
      version: '1.0.0',
      features: {
        voiceInput: environment !== 'production',
        imageUpload: true,
        analytics: true,
        encryption: environment === 'production',
        contextRetention: true,
        personalityAdaptation: true
      },
      limits: {
        maxMessageLength: 10000,
        maxImageSize: 10 * 1024 * 1024, // 10MB
        maxConversationHistory: 1000,
        maxConcurrentInstances: 5,
        rateLimit: {
          messages: 100,
          images: 10,
          windowMs: 60000 // 1 minute
        }
      },
      security: {
        encryptionRequired: environment === 'production',
        tokenExpirationMs: 24 * 60 * 60 * 1000, // 24 hours
        maxLoginAttempts: 3,
        sessionTimeoutMs: 60 * 60 * 1000, // 1 hour
        auditLogging: environment === 'production'
      },
      performance: {
        connectionTimeout: 5000,
        responseTimeout: 30000,
        heartbeatInterval: 30000,
        reconnectAttempts: 5,
        prefetchEnabled: true
      }
    };
  }

  private loadConfigurationSchema(): void {
    this.configurationSchema = {
      version: '1.0.0',
      definitions: {
        AviInstanceConfig: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            aviUserId: { type: 'string' },
            aviSessionId: { type: 'string' },
            dmChannelId: { type: 'string' },
            personalityMode: {
              type: 'string',
              enum: ['professional', 'casual', 'supportive', 'analytical', 'creative', 'adaptive']
            }
          },
          required: ['id', 'name', 'aviUserId', 'aviSessionId', 'dmChannelId']
        },
        AviPersonalityProfile: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            mode: {
              type: 'string',
              enum: ['professional', 'casual', 'supportive', 'analytical', 'creative', 'adaptive']
            }
          },
          required: ['id', 'name', 'mode']
        }
      }
    };
  }

  private initializeDefaultProfiles(): void {
    const defaultProfiles: AviPersonalityProfile[] = [
      {
        id: 'professional',
        name: 'Professional',
        mode: 'professional',
        description: 'Formal, precise, and business-focused communication',
        settings: {
          responseStyle: 'detailed',
          formalityLevel: 'professional',
          emotionalTone: 'neutral',
          technicalDepth: 'advanced',
          adaptationSpeed: 'moderate',
          contextSensitivity: 'high'
        },
        isDefault: true
      },
      {
        id: 'casual',
        name: 'Casual',
        mode: 'casual',
        description: 'Friendly, approachable, and conversational',
        settings: {
          responseStyle: 'interactive',
          formalityLevel: 'casual',
          emotionalTone: 'warm',
          technicalDepth: 'intermediate',
          adaptationSpeed: 'fast',
          contextSensitivity: 'medium'
        },
        isDefault: true
      },
      {
        id: 'supportive',
        name: 'Supportive',
        mode: 'supportive',
        description: 'Encouraging, patient, and nurturing',
        settings: {
          responseStyle: 'detailed',
          formalityLevel: 'casual',
          emotionalTone: 'supportive',
          technicalDepth: 'basic',
          adaptationSpeed: 'slow',
          contextSensitivity: 'high'
        },
        customPrompts: {
          encouragement: "You're doing great! Let's work through this together."
        },
        isDefault: true
      }
    ];

    defaultProfiles.forEach(profile => {
      this.personalityProfiles.set(profile.id, profile);
    });
  }

  private initializeDefaultTemplates(): void {
    const defaultTemplates: ConfigurationTemplate[] = [
      {
        id: 'general-assistant',
        name: 'General Assistant',
        description: 'Balanced configuration for general assistance',
        category: 'general',
        config: {
          personalityMode: 'adaptive',
          responseLatency: 'natural',
          privacyLevel: 'standard',
          contextRetention: 'session'
        },
        userPreferences: {
          preferredLanguage: 'en',
          responseFormat: 'markdown',
          technicalDetail: 'medium'
        },
        personalityProfile: 'adaptive',
        tags: ['general', 'adaptive', 'default']
      },
      {
        id: 'business-professional',
        name: 'Business Professional',
        description: 'Professional configuration for business use',
        category: 'business',
        config: {
          personalityMode: 'professional',
          responseLatency: 'immediate',
          privacyLevel: 'enhanced',
          contextRetention: 'persistent'
        },
        userPreferences: {
          preferredLanguage: 'en',
          responseFormat: 'structured',
          technicalDetail: 'high'
        },
        personalityProfile: 'professional',
        tags: ['business', 'professional', 'formal']
      }
    ];

    defaultTemplates.forEach(template => {
      this.configurationTemplates.set(template.id, template);
    });
  }

  private setupMigrationHandlers(): void {
    // Migration from 1.0.0 to future versions would go here
    this.migrationHandlers.set('1.0.0->1.1.0', (config) => {
      // Migration logic
      return config;
    });
  }

  private async migrateConfiguration(configData: any): Promise<any> {
    const fromVersion = configData.version;
    const toVersion = this.currentVersion;

    // Find migration path
    const migrationKey = `${fromVersion}->${toVersion}`;
    const migrationHandler = this.migrationHandlers.get(migrationKey);

    if (migrationHandler) {
      return migrationHandler(configData);
    }

    // If no direct migration path, throw error
    throw new AviError(`No migration path from ${fromVersion} to ${toVersion}`, 'VALIDATION_ERROR');
  }

  private async persistSystemConfig(): Promise<void> {
    // In a real implementation, this would persist to storage
    console.log('Persisting system config');
  }

  private async persistPersonalityProfiles(): Promise<void> {
    // In a real implementation, this would persist to storage
    console.log('Persisting personality profiles');
  }

  private async persistConfigurationTemplates(): Promise<void> {
    // In a real implementation, this would persist to storage
    console.log('Persisting configuration templates');
  }

  private async persistUserConfiguration(userId: string, config: AviInstanceConfig): Promise<void> {
    // In a real implementation, this would persist to storage
    console.log('Persisting user configuration for', userId);
  }

  private async persistAllConfigurations(): Promise<void> {
    await Promise.all([
      this.persistSystemConfig(),
      this.persistPersonalityProfiles(),
      this.persistConfigurationTemplates()
    ]);
  }
}

/**
 * Configuration validation service
 */
class ConfigurationValidator {
  validateSystemConfig(config: AviSystemConfig): boolean {
    // Basic validation logic
    return !!(
      config.environment &&
      config.apiBaseUrl &&
      config.websocketUrl &&
      config.version
    );
  }

  validateInstanceConfig(config: AviInstanceConfig): boolean {
    return !!(
      config.id &&
      config.name &&
      config.aviUserId &&
      config.aviSessionId &&
      config.dmChannelId
    );
  }

  validatePersonalityProfile(profile: AviPersonalityProfile): boolean {
    return !!(
      profile.id &&
      profile.name &&
      profile.mode &&
      profile.settings
    );
  }

  validateConfigurationTemplate(template: ConfigurationTemplate): boolean {
    return !!(
      template.id &&
      template.name &&
      template.category &&
      template.config
    );
  }
}

export default AviConfigurationManager;