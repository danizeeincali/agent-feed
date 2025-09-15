/**
 * AviPersonality - Advanced AI Personality Engine for Agent Coordination
 *
 * This module provides comprehensive behavioral protocols for Avi's AI personality,
 * including agent invocation patterns, contextual response adaptation, emotional
 * intelligence, and multi-agent coordination. Designed for seamless integration
 * with chat interfaces and agent management systems.
 *
 * Features:
 * - Dynamic personality trait modeling
 * - Contextual response adaptation
 * - Emotional intelligence and sentiment analysis
 * - Agent specialization behaviors
 * - Multi-agent coordination protocols
 * - Learning and adaptation capabilities
 * - Memory integration and context awareness
 *
 * @version 2.0.0
 * @author AviPersonality Team
 */

import { EventEmitter } from 'events';
import { ContextManager } from './ContextManager';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Core personality traits that define agent behavior
 */
export interface PersonalityTraits {
  analytical: number;          // 0.0 - 1.0: Logical, data-driven thinking
  creative: number;            // 0.0 - 1.0: Innovative, out-of-box solutions
  empathetic: number;          // 0.0 - 1.0: Understanding, emotional awareness
  detail_oriented: number;     // 0.0 - 1.0: Attention to specifics
  collaborative: number;       // 0.0 - 1.0: Team-oriented approach
  systematic: number;          // 0.0 - 1.0: Methodical, structured approach
  constructive: number;        // 0.0 - 1.0: Solution-focused feedback
  thorough: number;           // 0.0 - 1.0: Comprehensive analysis
  cautious: number;           // 0.0 - 1.0: Risk-aware, careful approach
  quality_focused: number;    // 0.0 - 1.0: Standards and excellence
  risk_aware: number;         // 0.0 - 1.0: Security and safety conscious
  performance_focused: number;// 0.0 - 1.0: Optimization mindset
  metrics_driven: number;     // 0.0 - 1.0: Data-based decisions
  optimization_minded: number;// 0.0 - 1.0: Efficiency-focused
  security_focused: number;   // 0.0 - 1.0: Security-first approach
  compliance_aware: number;   // 0.0 - 1.0: Standards compliance
  methodical: number;         // 0.0 - 1.0: Step-by-step approach
}

/**
 * Communication style preferences
 */
export interface CommunicationStyle {
  tone: 'professional' | 'friendly' | 'casual' | 'formal' | 'technical' | 'careful' | 'enthusiastic' | 'encouraging';
  verbosity: 'concise' | 'balanced' | 'detailed' | 'comprehensive';
  technical_depth: 'basic' | 'intermediate' | 'high' | 'expert' | 'simplified';
  feedback_style: 'direct' | 'constructive' | 'encouraging' | 'comprehensive' | 'collaborative';
  explanation_approach: 'step_by_step' | 'overview_first' | 'example_driven' | 'theory_first';
}

/**
 * Agent specialization areas
 */
export type AgentSpecialization =
  | 'code_review' | 'architecture' | 'best_practices'
  | 'testing' | 'validation' | 'quality_assurance'
  | 'security' | 'code_quality' | 'compliance'
  | 'performance' | 'optimization' | 'metrics'
  | 'user_experience' | 'accessibility' | 'design'
  | 'devops' | 'deployment' | 'monitoring'
  | 'research' | 'analysis' | 'documentation';

/**
 * Context-specific response patterns
 */
export interface ResponsePatterns {
  greeting: string;
  question: string;
  code_review?: string;
  validation?: string;
  security_review?: string;
  performance_analysis?: string;
  encouragement: string;
  concerns?: string;
  approval?: string;
  error_handling?: string;
  collaboration?: string;
}

/**
 * Complete personality profile for an agent
 */
export interface PersonalityProfile {
  agentId: string;
  agentType: string;
  traits: PersonalityTraits;
  communication_style: CommunicationStyle;
  specializations: AgentSpecialization[];
  response_patterns: ResponsePatterns;
  behavioral_modifiers: {
    urgency_sensitivity: number;    // How much urgency affects behavior
    context_adaptability: number;   // How much context changes behavior
    learning_rate: number;          // How quickly traits adapt
    empathy_threshold: number;      // When to apply emotional intelligence
  };
  memory_preferences: {
    remember_user_preferences: boolean;
    track_interaction_success: boolean;
    adapt_based_on_feedback: boolean;
    maintain_conversation_context: boolean;
  };
}

/**
 * User context and sentiment analysis
 */
export interface UserSentiment {
  emotion: 'excited' | 'frustrated' | 'confused' | 'satisfied' | 'stressed' | 'discouraged' | 'neutral' | 'curious';
  intensity: number;              // 0.0 - 1.0
  urgency: 'low' | 'medium' | 'high' | 'critical';
  technical_level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  confidence: number;             // 0.0 - 1.0: Confidence in analysis
  context: string;                // Context that influenced sentiment
}

/**
 * Emotional intelligence response configuration
 */
export interface EmotionalResponse {
  response_approach: 'empathetic_supportive' | 'professional_helpful' | 'encouraging_motivational' | 'direct_solution';
  tone_adjustment: 'calming' | 'energizing' | 'neutral' | 'careful' | 'enthusiastic';
  priority: 'technical_first' | 'emotional_first' | 'balanced' | 'reassurance_first';
  include_motivational_elements: boolean;
  adjust_technical_depth: boolean;
}

/**
 * Agent decision logic for task routing
 */
export interface AgentDecision {
  primary_agent: string;
  supporting_agents: string[];
  confidence: number;
  reasoning: string;
  specialization_match: number;
  estimated_complexity: 'low' | 'medium' | 'high' | 'expert';
  recommended_approach: string;
}

/**
 * Personality response generation result
 */
export interface PersonalityResponse {
  content: string;
  tone: string;
  confidence: number;
  emotional_response?: string;
  specialization_applied?: string;
  suggestions?: string[];
  metadata: {
    traits_applied: Partial<PersonalityTraits>;
    style_adjustments: Partial<CommunicationStyle>;
    context_factors: string[];
    learning_updates?: any;
  };
}

/**
 * Context for personality adaptation
 */
export interface PersonalityContext {
  message: string;
  agentId: string;
  conversationHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    metadata?: any;
  }>;
  userProfile: {
    technical_level?: string;
    preferred_style?: string;
    interaction_history?: any[];
  };
  projectContext?: any;
  urgency_indicators: string[];
  emotional_context?: UserSentiment;
  multi_agent_context?: {
    primary_agent: string;
    supporting_agents: string[];
    coordination_needed: boolean;
  };
}

/**
 * Learning and adaptation data
 */
export interface LearningData {
  interaction_id: string;
  user_feedback: 'positive' | 'negative' | 'neutral';
  feedback_details?: string;
  successful_patterns: string[];
  improvement_areas: string[];
  trait_adjustments: Partial<PersonalityTraits>;
  style_preferences: Partial<CommunicationStyle>;
}

// ============================================================================
// PREDEFINED PERSONALITY PROFILES
// ============================================================================

/**
 * Comprehensive personality profiles for different agent types
 */
export const AGENT_PERSONALITY_PROFILES: Record<string, PersonalityProfile> = {
  'tech-reviewer': {
    agentId: 'tech-reviewer',
    agentType: 'TechReviewer',
    traits: {
      analytical: 0.9,
      creative: 0.6,
      empathetic: 0.7,
      detail_oriented: 0.95,
      collaborative: 0.8,
      systematic: 0.9,
      constructive: 0.85,
      thorough: 0.9,
      cautious: 0.7,
      quality_focused: 0.9,
      risk_aware: 0.75,
      performance_focused: 0.8,
      metrics_driven: 0.75,
      optimization_minded: 0.8,
      security_focused: 0.7,
      compliance_aware: 0.75,
      methodical: 0.85
    },
    communication_style: {
      tone: 'professional',
      verbosity: 'balanced',
      technical_depth: 'high',
      feedback_style: 'constructive',
      explanation_approach: 'step_by_step'
    },
    specializations: ['code_review', 'architecture', 'best_practices'],
    response_patterns: {
      greeting: 'Hello! I\'m ready to review your code and provide architectural guidance.',
      question: 'What specific aspect would you like me to focus on?',
      code_review: 'Let me analyze this code for potential improvements...',
      encouragement: 'Great work! Here are some suggestions to make it even better.',
      collaboration: 'I\'d recommend we also involve our security and performance specialists for a comprehensive review.',
      error_handling: 'I notice some areas where error handling could be more robust.'
    },
    behavioral_modifiers: {
      urgency_sensitivity: 0.8,
      context_adaptability: 0.9,
      learning_rate: 0.7,
      empathy_threshold: 0.6
    },
    memory_preferences: {
      remember_user_preferences: true,
      track_interaction_success: true,
      adapt_based_on_feedback: true,
      maintain_conversation_context: true
    }
  },

  'system-validator': {
    agentId: 'system-validator',
    agentType: 'SystemValidator',
    traits: {
      analytical: 0.95,
      creative: 0.4,
      empathetic: 0.6,
      detail_oriented: 0.98,
      collaborative: 0.7,
      systematic: 0.95,
      constructive: 0.8,
      thorough: 0.95,
      cautious: 0.9,
      quality_focused: 0.95,
      risk_aware: 0.85,
      performance_focused: 0.7,
      metrics_driven: 0.9,
      optimization_minded: 0.6,
      security_focused: 0.8,
      compliance_aware: 0.9,
      methodical: 0.95
    },
    communication_style: {
      tone: 'careful',
      verbosity: 'detailed',
      technical_depth: 'high',
      feedback_style: 'comprehensive',
      explanation_approach: 'step_by_step'
    },
    specializations: ['testing', 'validation', 'quality_assurance'],
    response_patterns: {
      greeting: 'Hello! I\'m here to help ensure your system meets all quality standards.',
      question: 'Let me understand the validation requirements first.',
      validation: 'Let me run through our validation checklist...',
      concerns: 'I\'ve identified some areas that need attention.',
      approval: 'Excellent! All validation criteria have been met.',
      encouragement: 'Great work! Your system is meeting quality standards.',
      error_handling: 'We need to address these validation failures before proceeding.'
    },
    behavioral_modifiers: {
      urgency_sensitivity: 0.7,
      context_adaptability: 0.8,
      learning_rate: 0.6,
      empathy_threshold: 0.5
    },
    memory_preferences: {
      remember_user_preferences: true,
      track_interaction_success: true,
      adapt_based_on_feedback: true,
      maintain_conversation_context: true
    }
  },

  'quality-assurance': {
    agentId: 'quality-assurance',
    agentType: 'QualityAssurance',
    traits: {
      analytical: 0.9,
      creative: 0.5,
      empathetic: 0.7,
      detail_oriented: 0.95,
      collaborative: 0.8,
      systematic: 0.9,
      constructive: 0.85,
      thorough: 0.95,
      cautious: 0.85,
      quality_focused: 0.98,
      risk_aware: 0.8,
      performance_focused: 0.75,
      metrics_driven: 0.85,
      optimization_minded: 0.7,
      security_focused: 0.75,
      compliance_aware: 0.85,
      methodical: 0.9
    },
    communication_style: {
      tone: 'professional',
      verbosity: 'detailed',
      technical_depth: 'high',
      feedback_style: 'comprehensive',
      explanation_approach: 'step_by_step'
    },
    specializations: ['quality_assurance', 'testing', 'validation'],
    response_patterns: {
      greeting: 'Hello! I\'m your quality assurance specialist, ready to ensure excellence.',
      question: 'What quality aspects should we focus on?',
      validation: 'I\'ll create a comprehensive test plan covering all scenarios.',
      encouragement: 'Great foundation! Let\'s add some edge case testing to make it bulletproof.',
      concerns: 'I\'ve found some quality gaps we should address.'
    },
    behavioral_modifiers: {
      urgency_sensitivity: 0.75,
      context_adaptability: 0.85,
      learning_rate: 0.7,
      empathy_threshold: 0.6
    },
    memory_preferences: {
      remember_user_preferences: true,
      track_interaction_success: true,
      adapt_based_on_feedback: true,
      maintain_conversation_context: true
    }
  },

  'code-auditor': {
    agentId: 'code-auditor',
    agentType: 'CodeAuditor',
    traits: {
      analytical: 0.95,
      creative: 0.4,
      empathetic: 0.5,
      detail_oriented: 0.98,
      collaborative: 0.7,
      systematic: 0.95,
      constructive: 0.8,
      thorough: 0.95,
      cautious: 0.9,
      quality_focused: 0.9,
      risk_aware: 0.95,
      performance_focused: 0.7,
      metrics_driven: 0.8,
      optimization_minded: 0.7,
      security_focused: 0.95,
      compliance_aware: 0.9,
      methodical: 0.9
    },
    communication_style: {
      tone: 'professional',
      verbosity: 'detailed',
      technical_depth: 'expert',
      feedback_style: 'direct',
      explanation_approach: 'theory_first'
    },
    specializations: ['security', 'code_quality', 'compliance'],
    response_patterns: {
      greeting: 'Hello! I\'m here to conduct a thorough security and compliance audit.',
      question: 'What security concerns should I prioritize?',
      security_review: 'I\'ll analyze this for security vulnerabilities and compliance issues.',
      concerns: 'I\'ve identified several security concerns that require immediate attention.',
      approval: 'Security audit passed. All compliance requirements are met.',
      encouragement: 'Good security practices! Let\'s enhance them further.'
    },
    behavioral_modifiers: {
      urgency_sensitivity: 0.9,
      context_adaptability: 0.7,
      learning_rate: 0.6,
      empathy_threshold: 0.4
    },
    memory_preferences: {
      remember_user_preferences: true,
      track_interaction_success: true,
      adapt_based_on_feedback: false,
      maintain_conversation_context: true
    }
  },

  'performance-analyst': {
    agentId: 'performance-analyst',
    agentType: 'PerformanceAnalyst',
    traits: {
      analytical: 0.95,
      creative: 0.7,
      empathetic: 0.6,
      detail_oriented: 0.9,
      collaborative: 0.8,
      systematic: 0.85,
      constructive: 0.8,
      thorough: 0.85,
      cautious: 0.7,
      quality_focused: 0.8,
      risk_aware: 0.7,
      performance_focused: 0.95,
      metrics_driven: 0.9,
      optimization_minded: 0.95,
      security_focused: 0.6,
      compliance_aware: 0.7,
      methodical: 0.85
    },
    communication_style: {
      tone: 'technical',
      verbosity: 'balanced',
      technical_depth: 'high',
      feedback_style: 'direct',
      explanation_approach: 'example_driven'
    },
    specializations: ['performance', 'optimization', 'metrics'],
    response_patterns: {
      greeting: 'Hello! I\'m ready to analyze and optimize your system\'s performance.',
      question: 'What performance metrics are you most concerned about?',
      performance_analysis: 'Let me analyze the performance bottlenecks and optimization opportunities.',
      encouragement: 'Good performance baseline! Here are some optimization strategies.',
      concerns: 'I\'ve identified several performance bottlenecks that need addressing.'
    },
    behavioral_modifiers: {
      urgency_sensitivity: 0.8,
      context_adaptability: 0.85,
      learning_rate: 0.8,
      empathy_threshold: 0.5
    },
    memory_preferences: {
      remember_user_preferences: true,
      track_interaction_success: true,
      adapt_based_on_feedback: true,
      maintain_conversation_context: true
    }
  }
};

// ============================================================================
// MAIN PERSONALITY ENGINE CLASS
// ============================================================================

/**
 * Advanced AI Personality Engine
 *
 * Core engine that manages personality traits, behavioral patterns, and
 * contextual response generation for AI agents. Provides sophisticated
 * emotional intelligence, learning capabilities, and multi-agent coordination.
 */
export class AviPersonalityEngine extends EventEmitter {
  private personalityProfiles: Map<string, PersonalityProfile> = new Map();
  private userInteractionHistory: Map<string, any[]> = new Map();
  private learningData: Map<string, LearningData[]> = new Map();
  private contextManager: ContextManager | null = null;
  private memoryStore: Map<string, any> = new Map();
  private activeAgents: Set<string> = new Set();

  constructor(contextManager?: ContextManager) {
    super();
    this.contextManager = contextManager || null;
    this.initializePersonalities();
    this.setupMemoryStore();
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  private initializePersonalities(): void {
    // Load predefined personality profiles
    Object.values(AGENT_PERSONALITY_PROFILES).forEach(profile => {
      this.personalityProfiles.set(profile.agentId, profile);
    });

    this.emit('personalitiesInitialized', {
      count: this.personalityProfiles.size,
      profiles: Array.from(this.personalityProfiles.keys())
    });
  }

  private setupMemoryStore(): void {
    // Initialize memory with default preferences
    this.memoryStore.set('user_preferences', {
      preferred_communication_style: 'balanced',
      technical_level: 'intermediate',
      feedback_frequency: 'normal'
    });

    this.memoryStore.set('interaction_patterns', {
      successful_approaches: [],
      failed_approaches: [],
      user_satisfaction_scores: []
    });
  }

  // ============================================================================
  // CORE PERSONALITY METHODS
  // ============================================================================

  /**
   * Get personality traits for a specific agent
   */
  getPersonalityTraits(agentId: string): PersonalityTraits {
    const profile = this.personalityProfiles.get(agentId);
    if (!profile) {
      // Return default neutral traits
      return this.getDefaultTraits();
    }
    return { ...profile.traits };
  }

  /**
   * Get complete personality profile for an agent
   */
  getPersonalityProfile(agentId: string): PersonalityProfile | null {
    return this.personalityProfiles.get(agentId) || null;
  }

  /**
   * Update personality traits (learning/adaptation)
   */
  updatePersonalityTraits(agentId: string, traitUpdates: Partial<PersonalityTraits>): void {
    const profile = this.personalityProfiles.get(agentId);
    if (!profile) return;

    // Apply bounded updates (ensure traits stay in 0-1 range)
    Object.entries(traitUpdates).forEach(([trait, value]) => {
      if (typeof value === 'number' && trait in profile.traits) {
        profile.traits[trait as keyof PersonalityTraits] = Math.max(0, Math.min(1, value));
      }
    });

    this.personalityProfiles.set(agentId, profile);
    this.emit('personalityUpdated', { agentId, updates: traitUpdates });
  }

  // ============================================================================
  // RESPONSE GENERATION
  // ============================================================================

  /**
   * Generate a contextual response based on personality and situation
   */
  async generateResponse(context: PersonalityContext): Promise<PersonalityResponse> {
    const profile = this.personalityProfiles.get(context.agentId);
    if (!profile) {
      throw new Error(`No personality profile found for agent: ${context.agentId}`);
    }

    // Analyze user sentiment and context
    const sentiment = await this.analyzeUserSentiment(context.message);
    const emotionalResponse = this.updateEmotionalState({
      user_emotion: sentiment.emotion,
      intensity: sentiment.intensity,
      agent_response_needed: this.determineEmotionalResponseType(sentiment)
    });

    // Adapt communication style based on context
    const adaptedStyle = await this.adaptCommunicationStyle(profile, context, sentiment);

    // Generate base response using personality
    const baseResponse = this.generateBaseResponse(profile, context, sentiment);

    // Apply emotional intelligence adjustments
    const emotionallyAdjustedResponse = this.applyEmotionalIntelligence(
      baseResponse,
      emotionalResponse,
      profile
    );

    // Apply specialization-specific patterns
    const specializedResponse = this.applySpecializationPatterns(
      emotionallyAdjustedResponse,
      profile,
      context
    );

    // Generate suggestions and metadata
    const suggestions = this.generateSuggestions(profile, context, sentiment);
    const metadata = this.buildResponseMetadata(profile, adaptedStyle, context, sentiment);

    const response: PersonalityResponse = {
      content: specializedResponse,
      tone: adaptedStyle.tone,
      confidence: this.calculateConfidence(profile, context),
      emotional_response: emotionalResponse.response_approach,
      specialization_applied: profile.specializations[0],
      suggestions,
      metadata
    };

    // Record interaction for learning
    this.recordInteraction(context.agentId, context, response);

    this.emit('responseGenerated', { agentId: context.agentId, response });
    return response;
  }

  /**
   * Analyze user sentiment and emotional state
   */
  async analyzeUserSentiment(message: string): Promise<UserSentiment> {
    const lowerMessage = message.toLowerCase();

    // Emotion detection patterns
    const emotionPatterns = {
      excited: ['amazing', 'fantastic', 'great', 'awesome', 'excellent', 'perfect', 'love', '!'],
      frustrated: ['stuck', 'broken', 'not working', 'error', 'problem', 'issue', 'damn', 'hate'],
      confused: ['confused', 'don\'t understand', 'unclear', 'what', 'how', '?'],
      stressed: ['urgent', 'deadline', 'quickly', 'asap', 'emergency', 'crisis'],
      discouraged: ['give up', 'never work', 'hopeless', 'can\'t', 'impossible', 'failed'],
      curious: ['interesting', 'learn', 'explain', 'understand', 'tell me', 'how does'],
      satisfied: ['thanks', 'good', 'works', 'helpful', 'solved', 'fixed']
    };

    // Urgency detection
    const urgencyIndicators = {
      critical: ['emergency', 'critical', 'urgent', 'asap', 'immediately'],
      high: ['quickly', 'soon', 'deadline', 'time sensitive'],
      medium: ['when possible', 'sometime', 'later'],
      low: ['eventually', 'no rush', 'whenever']
    };

    // Technical level detection
    const technicalIndicators = {
      beginner: ['new to', 'just started', 'don\'t know', 'basic', 'simple'],
      intermediate: ['some experience', 'familiar with', 'understand'],
      advanced: ['optimize', 'performance', 'architecture', 'design patterns'],
      expert: ['algorithms', 'complexity', 'benchmarks', 'profiling']
    };

    let detectedEmotion: UserSentiment['emotion'] = 'neutral';
    let detectedUrgency: UserSentiment['urgency'] = 'medium';
    let detectedTechnicalLevel: UserSentiment['technical_level'] = 'intermediate';
    let emotionIntensity = 0.5;

    // Analyze emotion
    let maxEmotionScore = 0;
    Object.entries(emotionPatterns).forEach(([emotion, patterns]) => {
      const score = patterns.reduce((acc, pattern) => {
        return acc + (lowerMessage.includes(pattern) ? 1 : 0);
      }, 0);

      if (score > maxEmotionScore) {
        maxEmotionScore = score;
        detectedEmotion = emotion as UserSentiment['emotion'];
        emotionIntensity = Math.min(score * 0.3, 1.0);
      }
    });

    // Analyze urgency
    Object.entries(urgencyIndicators).forEach(([urgency, indicators]) => {
      if (indicators.some(indicator => lowerMessage.includes(indicator))) {
        detectedUrgency = urgency as UserSentiment['urgency'];
      }
    });

    // Analyze technical level
    Object.entries(technicalIndicators).forEach(([level, indicators]) => {
      if (indicators.some(indicator => lowerMessage.includes(indicator))) {
        detectedTechnicalLevel = level as UserSentiment['technical_level'];
      }
    });

    return {
      emotion: detectedEmotion,
      intensity: emotionIntensity,
      urgency: detectedUrgency,
      technical_level: detectedTechnicalLevel,
      confidence: maxEmotionScore > 0 ? 0.8 : 0.5,
      context: 'text_analysis'
    };
  }

  /**
   * Update emotional state and determine response strategy
   */
  updateEmotionalState(emotionalContext: {
    user_emotion: string;
    intensity: number;
    agent_response_needed: string;
  }): EmotionalResponse {
    const { user_emotion, intensity, agent_response_needed } = emotionalContext;

    // Determine response approach based on emotion and intensity
    let response_approach: EmotionalResponse['response_approach'] = 'professional_helpful';
    let tone_adjustment: EmotionalResponse['tone_adjustment'] = 'neutral';
    let priority: EmotionalResponse['priority'] = 'balanced';

    switch (user_emotion) {
      case 'frustrated':
      case 'stressed':
        response_approach = 'empathetic_supportive';
        tone_adjustment = 'calming';
        priority = 'reassurance_first';
        break;

      case 'discouraged':
        response_approach = 'encouraging_motivational';
        tone_adjustment = 'energizing';
        priority = 'emotional_first';
        break;

      case 'excited':
        response_approach = 'professional_helpful';
        tone_adjustment = 'enthusiastic';
        priority = 'technical_first';
        break;

      case 'confused':
        response_approach = 'professional_helpful';
        tone_adjustment = 'careful';
        priority = 'technical_first';
        break;

      default:
        response_approach = 'professional_helpful';
        tone_adjustment = 'neutral';
        priority = 'balanced';
    }

    // Adjust based on intensity
    const include_motivational_elements =
      (user_emotion === 'discouraged' || user_emotion === 'frustrated') && intensity > 0.6;

    const adjust_technical_depth =
      user_emotion === 'confused' || (user_emotion === 'frustrated' && intensity > 0.7);

    return {
      response_approach,
      tone_adjustment,
      priority,
      include_motivational_elements,
      adjust_technical_depth
    };
  }

  /**
   * Select appropriate response tone based on context
   */
  selectResponseTone(
    sentiment: UserSentiment,
    profile: PersonalityProfile
  ): string {
    const { emotion, urgency, intensity } = sentiment;
    const baseStyle = profile.communication_style;

    // Urgency overrides
    if (urgency === 'critical' || urgency === 'high') {
      return 'urgent_supportive';
    }

    // Emotional overrides
    if (emotion === 'frustrated' && intensity > 0.7) {
      return 'calming_supportive';
    }

    if (emotion === 'excited' && intensity > 0.6) {
      return 'enthusiastic_professional';
    }

    if (emotion === 'discouraged') {
      return 'encouraging_supportive';
    }

    // Default to profile tone with minor adjustments
    return `${baseStyle.tone}_${baseStyle.feedback_style}`;
  }

  // ============================================================================
  // CONTEXTUAL ADAPTATION
  // ============================================================================

  /**
   * Adapt communication style to context and user needs
   */
  async adaptToContext(context: PersonalityContext): Promise<any> {
    const profile = this.personalityProfiles.get(context.agentId);
    if (!profile) return {};

    const adaptations: any = {
      style_adjustments: {},
      behavioral_changes: {},
      contextual_factors: []
    };

    // Analyze conversation history for patterns
    if (context.conversationHistory.length > 0) {
      const recentMessages = context.conversationHistory.slice(-5);
      const userMessages = recentMessages.filter(msg => msg.role === 'user');

      // Detect if user prefers detailed explanations
      const hasAskedForDetails = userMessages.some(msg =>
        msg.content.toLowerCase().includes('detail') ||
        msg.content.toLowerCase().includes('explain more')
      );

      if (hasAskedForDetails) {
        adaptations.style_adjustments.verbosity = 'detailed';
        adaptations.contextual_factors.push('user_prefers_detailed_explanations');
      }

      // Detect technical level from conversation
      const technicalTermsUsed = userMessages.reduce((count, msg) => {
        const technicalTerms = ['algorithm', 'optimize', 'refactor', 'architecture', 'pattern'];
        return count + technicalTerms.filter(term =>
          msg.content.toLowerCase().includes(term)
        ).length;
      }, 0);

      if (technicalTermsUsed > 3) {
        adaptations.style_adjustments.technical_depth = 'expert';
        adaptations.contextual_factors.push('user_demonstrates_technical_expertise');
      }
    }

    // Project context adaptations
    if (context.projectContext) {
      // Adapt based on project type, size, etc.
      adaptations.contextual_factors.push('project_context_available');
    }

    // Multi-agent context
    if (context.multi_agent_context?.coordination_needed) {
      adaptations.behavioral_changes.coordination_mode = true;
      adaptations.style_adjustments.tone = 'collaborative';
      adaptations.contextual_factors.push('multi_agent_coordination');
    }

    // User profile adaptations
    if (context.userProfile.technical_level) {
      adaptations.style_adjustments.technical_depth = this.mapTechnicalLevel(
        context.userProfile.technical_level
      );
    }

    return adaptations;
  }

  // ============================================================================
  // AGENT COORDINATION
  // ============================================================================

  /**
   * Determine which agents should be involved for a given task
   */
  determineAgentInvolvement(
    message: string,
    context: any = {}
  ): AgentDecision {
    const taskKeywords = {
      'code_review': ['review', 'code', 'function', 'class', 'method', 'implementation'],
      'security': ['security', 'vulnerability', 'authentication', 'authorization', 'encrypt'],
      'performance': ['performance', 'slow', 'optimize', 'speed', 'memory', 'cpu'],
      'testing': ['test', 'testing', 'bug', 'failure', 'broken', 'validate'],
      'architecture': ['architecture', 'design', 'structure', 'pattern', 'system'],
      'quality': ['quality', 'standards', 'best practices', 'clean', 'maintainable']
    };

    const lowerMessage = message.toLowerCase();
    const scores: Record<string, number> = {};

    // Calculate scores for each specialization
    Object.entries(taskKeywords).forEach(([specialization, keywords]) => {
      scores[specialization] = keywords.reduce((score, keyword) => {
        return score + (lowerMessage.includes(keyword) ? 1 : 0);
      }, 0);
    });

    // Find best matching agents
    const agentMatches = Array.from(this.personalityProfiles.values())
      .map(profile => {
        const matchScore = profile.specializations.reduce((score, spec) => {
          return score + (scores[spec] || 0);
        }, 0);

        return {
          agentId: profile.agentId,
          score: matchScore,
          profile
        };
      })
      .filter(match => match.score > 0)
      .sort((a, b) => b.score - a.score);

    if (agentMatches.length === 0) {
      // Default to general purpose agent
      return {
        primary_agent: 'tech-reviewer',
        supporting_agents: [],
        confidence: 0.5,
        reasoning: 'General purpose assignment',
        specialization_match: 0,
        estimated_complexity: 'medium',
        recommended_approach: 'collaborative'
      };
    }

    const primaryAgent = agentMatches[0];
    const supportingAgents = agentMatches.slice(1, 3).map(match => match.agentId);

    // Estimate complexity
    const complexityIndicators = ['architecture', 'system', 'complex', 'multiple', 'integrate'];
    const complexityScore = complexityIndicators.reduce((score, indicator) => {
      return score + (lowerMessage.includes(indicator) ? 1 : 0);
    }, 0);

    let estimatedComplexity: AgentDecision['estimated_complexity'] = 'medium';
    if (complexityScore >= 3) estimatedComplexity = 'expert';
    else if (complexityScore >= 2) estimatedComplexity = 'high';
    else if (complexityScore <= 1) estimatedComplexity = 'low';

    return {
      primary_agent: primaryAgent.agentId,
      supporting_agents: supportingAgents,
      confidence: Math.min(primaryAgent.score * 0.2, 1.0),
      reasoning: `Best match based on specializations: ${primaryAgent.profile.specializations.join(', ')}`,
      specialization_match: primaryAgent.score,
      estimated_complexity: estimatedComplexity,
      recommended_approach: supportingAgents.length > 0 ? 'collaborative' : 'individual'
    };
  }

  /**
   * Coordinate personality traits across multiple agents
   */
  coordinateMultiAgentPersonalities(
    agentIds: string[],
    taskContext: any
  ): Record<string, Partial<PersonalityProfile>> {
    const coordinatedProfiles: Record<string, Partial<PersonalityProfile>> = {};

    agentIds.forEach((agentId, index) => {
      const profile = this.personalityProfiles.get(agentId);
      if (!profile) return;

      const adjustments: Partial<PersonalityProfile> = {
        traits: { ...profile.traits },
        communication_style: { ...profile.communication_style }
      };

      // Primary agent gets enhanced confidence
      if (index === 0) {
        adjustments.traits!.collaborative = Math.min(profile.traits.collaborative + 0.1, 1.0);
        adjustments.communication_style!.tone = 'professional';
      } else {
        // Supporting agents are more collaborative and less verbose
        adjustments.traits!.collaborative = Math.min(profile.traits.collaborative + 0.2, 1.0);
        adjustments.communication_style!.verbosity = 'concise';
      }

      // Ensure unified communication style across agents
      adjustments.communication_style!.feedback_style = 'constructive';

      coordinatedProfiles[agentId] = adjustments;
    });

    return coordinatedProfiles;
  }

  // ============================================================================
  // LEARNING AND ADAPTATION
  // ============================================================================

  /**
   * Record interaction for learning purposes
   */
  private recordInteraction(
    agentId: string,
    context: PersonalityContext,
    response: PersonalityResponse
  ): void {
    const interaction = {
      timestamp: new Date().toISOString(),
      agentId,
      userMessage: context.message,
      agentResponse: response.content,
      traits_used: response.metadata.traits_applied,
      style_used: response.metadata.style_adjustments,
      context_factors: response.metadata.context_factors,
      confidence: response.confidence
    };

    // Store in user interaction history
    const userId = 'current_user'; // Would be actual user ID in real implementation
    if (!this.userInteractionHistory.has(userId)) {
      this.userInteractionHistory.set(userId, []);
    }
    this.userInteractionHistory.get(userId)!.push(interaction);

    // Limit history size
    const history = this.userInteractionHistory.get(userId)!;
    if (history.length > 100) {
      this.userInteractionHistory.set(userId, history.slice(-100));
    }
  }

  /**
   * Learn from user feedback and adapt personality
   */
  learnFromFeedback(
    agentId: string,
    feedback: 'positive' | 'negative' | 'neutral',
    feedbackDetails?: string,
    interactionContext?: any
  ): void {
    const profile = this.personalityProfiles.get(agentId);
    if (!profile) return;

    const learningRate = profile.behavioral_modifiers.learning_rate;
    const adjustmentMagnitude = learningRate * 0.1; // Small adjustments

    if (feedback === 'positive') {
      // Reinforce successful traits
      if (interactionContext?.traits_applied) {
        Object.entries(interactionContext.traits_applied).forEach(([trait, value]) => {
          if (typeof value === 'number' && trait in profile.traits) {
            const currentValue = profile.traits[trait as keyof PersonalityTraits];
            profile.traits[trait as keyof PersonalityTraits] = Math.min(
              currentValue + adjustmentMagnitude,
              1.0
            );
          }
        });
      }
    } else if (feedback === 'negative') {
      // Adjust problematic traits
      if (feedbackDetails?.includes('too detailed')) {
        if (profile.communication_style.verbosity === 'detailed') {
          profile.communication_style.verbosity = 'balanced';
        }
      }

      if (feedbackDetails?.includes('too technical')) {
        profile.communication_style.technical_depth = 'intermediate';
      }

      if (feedbackDetails?.includes('not helpful')) {
        profile.traits.empathetic = Math.min(profile.traits.empathetic + adjustmentMagnitude, 1.0);
        profile.traits.constructive = Math.min(profile.traits.constructive + adjustmentMagnitude, 1.0);
      }
    }

    // Store learning data
    const learningEntry: LearningData = {
      interaction_id: this.generateId(),
      user_feedback: feedback,
      feedback_details: feedbackDetails,
      successful_patterns: feedback === 'positive' ? [agentId] : [],
      improvement_areas: feedback === 'negative' ? [agentId] : [],
      trait_adjustments: {},
      style_preferences: {}
    };

    if (!this.learningData.has(agentId)) {
      this.learningData.set(agentId, []);
    }
    this.learningData.get(agentId)!.push(learningEntry);

    this.emit('learningUpdate', { agentId, feedback, adjustments: learningEntry });
  }

  // ============================================================================
  // MEMORY INTEGRATION
  // ============================================================================

  /**
   * Store personality-related memory
   */
  storeMemory(key: string, value: any, namespace: string = 'personality'): void {
    const fullKey = `${namespace}:${key}`;
    this.memoryStore.set(fullKey, {
      value,
      timestamp: new Date().toISOString(),
      namespace
    });

    this.emit('memoryStored', { key: fullKey, namespace });
  }

  /**
   * Retrieve personality-related memory
   */
  getMemory(key: string, namespace: string = 'personality'): any {
    const fullKey = `${namespace}:${key}`;
    const memory = this.memoryStore.get(fullKey);
    return memory ? memory.value : null;
  }

  /**
   * Search memory for patterns
   */
  searchMemory(pattern: string, namespace?: string): Array<{ key: string; value: any }> {
    const results: Array<{ key: string; value: any }> = [];

    this.memoryStore.forEach((memory, key) => {
      if (namespace && !key.startsWith(`${namespace}:`)) return;

      if (key.includes(pattern) || JSON.stringify(memory.value).includes(pattern)) {
        results.push({ key, value: memory.value });
      }
    });

    return results;
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private getDefaultTraits(): PersonalityTraits {
    return {
      analytical: 0.7,
      creative: 0.5,
      empathetic: 0.6,
      detail_oriented: 0.7,
      collaborative: 0.7,
      systematic: 0.6,
      constructive: 0.7,
      thorough: 0.6,
      cautious: 0.5,
      quality_focused: 0.7,
      risk_aware: 0.5,
      performance_focused: 0.5,
      metrics_driven: 0.5,
      optimization_minded: 0.5,
      security_focused: 0.5,
      compliance_aware: 0.5,
      methodical: 0.6
    };
  }

  private determineEmotionalResponseType(sentiment: UserSentiment): string {
    switch (sentiment.emotion) {
      case 'frustrated':
      case 'stressed':
        return 'calming_support';
      case 'discouraged':
        return 'encouragement';
      case 'excited':
        return 'enthusiastic_engagement';
      case 'confused':
        return 'clear_guidance';
      default:
        return 'professional_assistance';
    }
  }

  private async adaptCommunicationStyle(
    profile: PersonalityProfile,
    context: PersonalityContext,
    sentiment: UserSentiment
  ): Promise<CommunicationStyle> {
    const baseStyle = { ...profile.communication_style };

    // Adapt based on sentiment
    if (sentiment.emotion === 'confused' || sentiment.technical_level === 'beginner') {
      baseStyle.technical_depth = 'basic';
      baseStyle.verbosity = 'detailed';
      baseStyle.explanation_approach = 'step_by_step';
    }

    if (sentiment.urgency === 'high' || sentiment.urgency === 'critical') {
      baseStyle.verbosity = 'concise';
      baseStyle.feedback_style = 'direct';
    }

    if (sentiment.emotion === 'discouraged') {
      baseStyle.tone = 'encouraging';
      baseStyle.feedback_style = 'constructive';
    }

    return baseStyle;
  }

  private generateBaseResponse(
    profile: PersonalityProfile,
    context: PersonalityContext,
    sentiment: UserSentiment
  ): string {
    const patterns = profile.response_patterns;

    // Select appropriate pattern based on context
    if (context.message.toLowerCase().includes('review') && patterns.code_review) {
      return patterns.code_review;
    }

    if (context.message.toLowerCase().includes('test') && patterns.validation) {
      return patterns.validation;
    }

    if (context.message.toLowerCase().includes('security') && patterns.security_review) {
      return patterns.security_review;
    }

    if (context.message.toLowerCase().includes('performance') && patterns.performance_analysis) {
      return patterns.performance_analysis;
    }

    // Default response
    return patterns.question || "I'm ready to help you with this task.";
  }

  private applyEmotionalIntelligence(
    baseResponse: string,
    emotionalResponse: EmotionalResponse,
    profile: PersonalityProfile
  ): string {
    let response = baseResponse;

    // Add emotional adjustments based on response approach
    switch (emotionalResponse.response_approach) {
      case 'empathetic_supportive':
        response = `I understand this can be challenging. ${response}`;
        break;
      case 'encouraging_motivational':
        response = `You're on the right track! ${response}`;
        break;
      case 'professional_helpful':
        // Keep as is
        break;
    }

    // Add motivational elements if needed
    if (emotionalResponse.include_motivational_elements) {
      response += " Don't worry, we'll work through this together.";
    }

    return response;
  }

  private applySpecializationPatterns(
    response: string,
    profile: PersonalityProfile,
    context: PersonalityContext
  ): string {
    const specializations = profile.specializations;

    // Add specialization-specific language
    if (specializations.includes('security')) {
      response = response.replace(/\banalyz/g, 'audit and analyz');
    }

    if (specializations.includes('performance')) {
      response = response.replace(/\boptimiz/g, 'performance-optimiz');
    }

    if (specializations.includes('quality_assurance')) {
      response = response.replace(/\btest/g, 'comprehensively test');
    }

    return response;
  }

  private generateSuggestions(
    profile: PersonalityProfile,
    context: PersonalityContext,
    sentiment: UserSentiment
  ): string[] {
    const suggestions: string[] = [];

    // Add suggestions based on specialization
    if (profile.specializations.includes('code_review')) {
      suggestions.push('Consider code review best practices');
      suggestions.push('Check for potential security issues');
    }

    if (profile.specializations.includes('performance')) {
      suggestions.push('Run performance benchmarks');
      suggestions.push('Profile memory usage');
    }

    if (sentiment.technical_level === 'beginner') {
      suggestions.push('Start with basic examples');
      suggestions.push('Consider reading documentation');
    }

    return suggestions;
  }

  private buildResponseMetadata(
    profile: PersonalityProfile,
    style: CommunicationStyle,
    context: PersonalityContext,
    sentiment: UserSentiment
  ): PersonalityResponse['metadata'] {
    return {
      traits_applied: this.getAppliedTraits(profile, context),
      style_adjustments: {
        tone: style.tone,
        verbosity: style.verbosity,
        technical_depth: style.technical_depth
      },
      context_factors: [
        `emotion_${sentiment.emotion}`,
        `urgency_${sentiment.urgency}`,
        `technical_level_${sentiment.technical_level}`,
        ...profile.specializations.map(spec => `specialization_${spec}`)
      ]
    };
  }

  private getAppliedTraits(profile: PersonalityProfile, context: PersonalityContext): Partial<PersonalityTraits> {
    // Return subset of traits that were most relevant to this interaction
    const relevantTraits: Partial<PersonalityTraits> = {};

    if (context.message.toLowerCase().includes('detail')) {
      relevantTraits.detail_oriented = profile.traits.detail_oriented;
    }

    if (context.message.toLowerCase().includes('security')) {
      relevantTraits.security_focused = profile.traits.security_focused;
      relevantTraits.cautious = profile.traits.cautious;
    }

    if (context.message.toLowerCase().includes('performance')) {
      relevantTraits.performance_focused = profile.traits.performance_focused;
      relevantTraits.optimization_minded = profile.traits.optimization_minded;
    }

    // Always include collaborative and empathetic for human interaction
    relevantTraits.collaborative = profile.traits.collaborative;
    relevantTraits.empathetic = profile.traits.empathetic;

    return relevantTraits;
  }

  private calculateConfidence(profile: PersonalityProfile, context: PersonalityContext): number {
    let confidence = 0.7; // Base confidence

    // Increase confidence for specialization matches
    const messageSpecializations = this.detectSpecializations(context.message);
    const matches = messageSpecializations.filter(spec =>
      profile.specializations.includes(spec)
    ).length;

    confidence += matches * 0.1;

    // Adjust for context completeness
    if (context.conversationHistory.length > 0) {
      confidence += 0.1;
    }

    if (context.projectContext) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  private detectSpecializations(message: string): AgentSpecialization[] {
    const lowerMessage = message.toLowerCase();
    const detectedSpecs: AgentSpecialization[] = [];

    const specializationKeywords: Record<AgentSpecialization, string[]> = {
      'code_review': ['review', 'code', 'function', 'method'],
      'architecture': ['architecture', 'design', 'structure'],
      'best_practices': ['best practice', 'standard', 'convention'],
      'testing': ['test', 'testing', 'spec', 'validation'],
      'validation': ['validate', 'verify', 'check'],
      'quality_assurance': ['quality', 'qa', 'assurance'],
      'security': ['security', 'secure', 'vulnerability'],
      'code_quality': ['quality', 'clean', 'maintainable'],
      'compliance': ['compliance', 'standard', 'regulation'],
      'performance': ['performance', 'speed', 'optimization'],
      'optimization': ['optimize', 'efficiency', 'improve'],
      'metrics': ['metrics', 'measure', 'benchmark'],
      'user_experience': ['ux', 'user experience', 'usability'],
      'accessibility': ['accessibility', 'a11y', 'accessible'],
      'design': ['design', 'ui', 'interface'],
      'devops': ['devops', 'deployment', 'infrastructure'],
      'deployment': ['deploy', 'deployment', 'release'],
      'monitoring': ['monitor', 'logging', 'observability'],
      'research': ['research', 'investigate', 'analyze'],
      'analysis': ['analysis', 'analyze', 'study'],
      'documentation': ['document', 'documentation', 'docs']
    };

    Object.entries(specializationKeywords).forEach(([spec, keywords]) => {
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        detectedSpecs.push(spec as AgentSpecialization);
      }
    });

    return detectedSpecs;
  }

  private mapTechnicalLevel(level: string): CommunicationStyle['technical_depth'] {
    switch (level.toLowerCase()) {
      case 'beginner': return 'basic';
      case 'intermediate': return 'intermediate';
      case 'advanced': return 'high';
      case 'expert': return 'expert';
      default: return 'intermediate';
    }
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ============================================================================
  // PUBLIC API METHODS
  // ============================================================================

  /**
   * Get available agent types and their personalities
   */
  getAvailableAgents(): Array<{ id: string; type: string; specializations: string[] }> {
    return Array.from(this.personalityProfiles.values()).map(profile => ({
      id: profile.agentId,
      type: profile.agentType,
      specializations: profile.specializations
    }));
  }

  /**
   * Check if an agent is currently active
   */
  isAgentActive(agentId: string): boolean {
    return this.activeAgents.has(agentId);
  }

  /**
   * Activate an agent
   */
  activateAgent(agentId: string): void {
    this.activeAgents.add(agentId);
    this.emit('agentActivated', { agentId });
  }

  /**
   * Deactivate an agent
   */
  deactivateAgent(agentId: string): void {
    this.activeAgents.delete(agentId);
    this.emit('agentDeactivated', { agentId });
  }

  /**
   * Get interaction statistics
   */
  getInteractionStats(agentId?: string): any {
    if (agentId) {
      const learningData = this.learningData.get(agentId) || [];
      return {
        totalInteractions: learningData.length,
        positiveInteractions: learningData.filter(l => l.user_feedback === 'positive').length,
        negativeInteractions: learningData.filter(l => l.user_feedback === 'negative').length,
        neutralInteractions: learningData.filter(l => l.user_feedback === 'neutral').length
      };
    }

    // Return overall stats
    let totalInteractions = 0;
    let totalPositive = 0;
    let totalNegative = 0;
    let totalNeutral = 0;

    this.learningData.forEach(agentLearning => {
      totalInteractions += agentLearning.length;
      totalPositive += agentLearning.filter(l => l.user_feedback === 'positive').length;
      totalNegative += agentLearning.filter(l => l.user_feedback === 'negative').length;
      totalNeutral += agentLearning.filter(l => l.user_feedback === 'neutral').length;
    });

    return {
      totalInteractions,
      positiveInteractions: totalPositive,
      negativeInteractions: totalNegative,
      neutralInteractions: totalNeutral,
      agentCount: this.personalityProfiles.size
    };
  }

  /**
   * Export personality configuration
   */
  exportConfiguration(): any {
    return {
      personalities: Object.fromEntries(this.personalityProfiles),
      memory: Object.fromEntries(this.memoryStore),
      learningData: Object.fromEntries(this.learningData),
      stats: this.getInteractionStats()
    };
  }

  /**
   * Import personality configuration
   */
  importConfiguration(config: any): void {
    if (config.personalities) {
      this.personalityProfiles.clear();
      Object.entries(config.personalities).forEach(([id, profile]) => {
        this.personalityProfiles.set(id, profile as PersonalityProfile);
      });
    }

    if (config.memory) {
      this.memoryStore.clear();
      Object.entries(config.memory).forEach(([key, value]) => {
        this.memoryStore.set(key, value);
      });
    }

    if (config.learningData) {
      this.learningData.clear();
      Object.entries(config.learningData).forEach(([id, data]) => {
        this.learningData.set(id, data as LearningData[]);
      });
    }

    this.emit('configurationImported', { config });
  }

  /**
   * Reset all learning data (but keep personality profiles)
   */
  resetLearningData(): void {
    this.learningData.clear();
    this.userInteractionHistory.clear();
    this.emit('learningDataReset');
  }

  /**
   * Dispose of the personality engine
   */
  dispose(): void {
    this.personalityProfiles.clear();
    this.userInteractionHistory.clear();
    this.learningData.clear();
    this.memoryStore.clear();
    this.activeAgents.clear();
    this.removeAllListeners();
  }
}

// ============================================================================
// EXPORT DEFAULT INSTANCE
// ============================================================================

/**
 * Default AviPersonality service instance
 * Pre-configured with standard personality profiles and ready to use
 */
export const AviPersonalityService = new AviPersonalityEngine();


/**
 * Integration helper functions
 */
export const PersonalityUtils = {
  /**
   * Create a basic personality context for simple interactions
   */
  createBasicContext(
    message: string,
    agentId: string,
    conversationHistory: any[] = []
  ): PersonalityContext {
    return {
      message,
      agentId,
      conversationHistory,
      userProfile: {
        technical_level: 'intermediate'
      },
      urgency_indicators: []
    };
  },

  /**
   * Validate personality profile structure
   */
  validatePersonalityProfile(profile: any): boolean {
    const requiredFields = ['agentId', 'agentType', 'traits', 'communication_style', 'specializations'];
    return requiredFields.every(field => field in profile);
  },

  /**
   * Merge personality traits safely
   */
  mergeTraits(base: PersonalityTraits, updates: Partial<PersonalityTraits>): PersonalityTraits {
    const merged = { ...base };
    Object.entries(updates).forEach(([key, value]) => {
      if (typeof value === 'number' && value >= 0 && value <= 1) {
        (merged as any)[key] = value;
      }
    });
    return merged;
  }
};

export default AviPersonalityService;