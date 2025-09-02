/**
 * NLD User Feedback Capture System
 * Captures user feedback and integrates with failure pattern detection
 */

import { FailurePattern } from './FailureDetectionEngine';

export interface UserFeedback {
  id: string;
  timestamp: number;
  trigger: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  feedback: 'success' | 'failure' | 'partial';
  context: {
    userAction?: string;
    expectedResult?: string;
    actualResult?: string;
    component?: string;
    instanceId?: string;
  };
  rawInput: string;
  confidence: number;
}

export interface FeedbackTrigger {
  patterns: RegExp[];
  sentiment: UserFeedback['sentiment'];
  feedback: UserFeedback['feedback'];
  weight: number;
}

class UserFeedbackCapture {
  private feedbackHistory: Map<string, UserFeedback> = new Map();
  private triggers: FeedbackTrigger[] = [];
  private listeners: Array<(feedback: UserFeedback) => void> = [];
  private isListening: boolean = false;

  constructor() {
    this.initializeTriggers();
    this.setupCaptureMechanisms();
  }

  /**
   * Initialize feedback trigger patterns
   */
  private initializeTriggers(): void {
    // Failure feedback triggers
    this.triggers.push({
      patterns: [
        /didn't work/i,
        /not working/i,
        /failed/i,
        /broken/i,
        /error/i,
        /can't connect/i,
        /won't connect/i,
        /connection.*failed/i,
        /still.*broken/i,
        /same.*error/i
      ],
      sentiment: 'negative',
      feedback: 'failure',
      weight: 0.9
    });

    // Success feedback triggers
    this.triggers.push({
      patterns: [
        /working.*now/i,
        /that.*worked/i,
        /fixed/i,
        /connected/i,
        /success/i,
        /good.*now/i,
        /thank.*you/i,
        /perfect/i,
        /great/i,
        /awesome/i
      ],
      sentiment: 'positive',
      feedback: 'success',
      weight: 0.9
    });

    // Partial success triggers
    this.triggers.push({
      patterns: [
        /partially.*working/i,
        /some.*progress/i,
        /better.*but/i,
        /improved.*still/i,
        /kind.*of.*working/i,
        /mostly.*works/i
      ],
      sentiment: 'neutral',
      feedback: 'partial',
      weight: 0.7
    });

    // Instance-specific triggers
    this.triggers.push({
      patterns: [
        /instance.*not.*found/i,
        /claude.*\d+.*not.*running/i,
        /wrong.*instance/i,
        /stale.*instance/i,
        /old.*connection/i
      ],
      sentiment: 'negative',
      feedback: 'failure',
      weight: 0.95
    });
  }

  /**
   * Setup feedback capture mechanisms
   */
  private setupCaptureMechanisms(): void {
    // Chat/Message input monitoring
    this.setupChatMonitoring();
    
    // Button click feedback
    this.setupButtonFeedback();
    
    // Error message interactions
    this.setupErrorInteractions();
    
    // Component interaction feedback
    this.setupComponentFeedback();
  }

  /**
   * Capture and analyze user input for feedback patterns
   */
  public captureInput(
    input: string, 
    context: Partial<UserFeedback['context']> = {}
  ): UserFeedback | null {
    
    const trigger = this.analyzeFeedbackTrigger(input);
    
    if (!trigger) {
      return null; // No feedback pattern detected
    }

    const feedback: UserFeedback = {
      id: `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      trigger: input,
      sentiment: trigger.sentiment,
      feedback: trigger.feedback,
      context: {
        ...context,
        ...this.extractContextFromInput(input)
      },
      rawInput: input,
      confidence: trigger.weight
    };

    this.recordFeedback(feedback);
    this.notifyListeners(feedback);

    return feedback;
  }

  /**
   * Analyze input for feedback trigger patterns
   */
  private analyzeFeedbackTrigger(input: string): FeedbackTrigger | null {
    for (const trigger of this.triggers) {
      for (const pattern of trigger.patterns) {
        if (pattern.test(input)) {
          return trigger;
        }
      }
    }
    return null;
  }

  /**
   * Extract additional context from user input
   */
  private extractContextFromInput(input: string): Partial<UserFeedback['context']> {
    const context: Partial<UserFeedback['context']> = {};

    // Extract instance IDs
    const instanceMatch = input.match(/claude[-_]?(\d+)/i);
    if (instanceMatch) {
      context.instanceId = instanceMatch[0];
    }

    // Extract component mentions
    const componentPatterns = [
      /terminal/i,
      /connection/i,
      /chat/i,
      /dashboard/i,
      /manager/i,
      /launcher/i
    ];
    
    for (const pattern of componentPatterns) {
      if (pattern.test(input)) {
        context.component = pattern.source.replace(/[\/\\i]/g, '');
        break;
      }
    }

    // Extract user actions
    const actionPatterns = [
      /tried to connect/i,
      /clicked.*button/i,
      /refreshed/i,
      /reloaded/i,
      /restarted/i,
      /launched/i
    ];

    for (const pattern of actionPatterns) {
      const match = input.match(pattern);
      if (match) {
        context.userAction = match[0];
        break;
      }
    }

    return context;
  }

  /**
   * Setup chat/message monitoring for feedback
   */
  private setupChatMonitoring(): void {
    // Monitor chat inputs for feedback patterns
    if (typeof document !== 'undefined') {
      // Listen for Enter key in chat inputs
      document.addEventListener('keypress', (event) => {
        if (event.key === 'Enter' && event.target instanceof HTMLInputElement) {
          const input = event.target;
          
          if (input.value && this.isChatInput(input)) {
            setTimeout(() => {
              this.captureInput(input.value, {
                component: 'chat',
                userAction: 'chat_message'
              });
            }, 100);
          }
        }
      });

      // Listen for submit buttons in chat forms
      document.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        
        if (target.matches('[type="submit"], .send-button, .chat-submit')) {
          const form = target.closest('form');
          const input = form?.querySelector('input[type="text"], textarea') as HTMLInputElement;
          
          if (input?.value) {
            this.captureInput(input.value, {
              component: 'chat',
              userAction: 'chat_submit'
            });
          }
        }
      });
    }
  }

  /**
   * Setup button feedback monitoring
   */
  private setupButtonFeedback(): void {
    if (typeof document !== 'undefined') {
      document.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        
        // Monitor retry/refresh buttons
        if (target.matches('.retry-button, .refresh-button, .reconnect-button')) {
          // Capture implicit feedback that something failed
          this.captureInput('retry button clicked', {
            component: 'button',
            userAction: 'retry_clicked'
          });
        }

        // Monitor success acknowledgment buttons
        if (target.matches('.ok-button, .dismiss-button, .close-success')) {
          const successMessage = target.closest('.success-message, .notification-success');
          if (successMessage) {
            this.captureInput('success acknowledged', {
              component: 'notification',
              userAction: 'success_acknowledged'
            });
          }
        }
      });
    }
  }

  /**
   * Setup error message interaction monitoring
   */
  private setupErrorInteractions(): void {
    if (typeof document !== 'undefined') {
      // Monitor error message clicks/interactions
      document.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        const errorElement = target.closest('.error-message, .error-notification, .alert-error');
        
        if (errorElement) {
          const errorText = errorElement.textContent || '';
          this.captureInput(`error interaction: ${errorText}`, {
            component: 'error_display',
            userAction: 'error_clicked',
            actualResult: errorText
          });
        }
      });

      // Monitor error dismissal
      document.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        
        if (target.matches('.error-close, .dismiss-error')) {
          this.captureInput('error dismissed', {
            component: 'error_display',
            userAction: 'error_dismissed'
          });
        }
      });
    }
  }

  /**
   * Setup component-specific feedback
   */
  private setupComponentFeedback(): void {
    // Listen for custom component events
    if (typeof window !== 'undefined') {
      window.addEventListener('component:feedback', (event: any) => {
        const { component, action, message, context } = event.detail;
        
        this.captureInput(message, {
          component,
          userAction: action,
          ...context
        });
      });

      // Listen for connection status changes as implicit feedback
      window.addEventListener('connection:status', (event: any) => {
        const { status, instanceId } = event.detail;
        
        if (status === 'connected') {
          this.captureInput('connection successful', {
            component: 'connection',
            userAction: 'auto_connect',
            instanceId,
            actualResult: 'connected'
          });
        } else if (status === 'failed') {
          this.captureInput('connection failed', {
            component: 'connection',
            userAction: 'auto_connect',
            instanceId,
            actualResult: 'failed'
          });
        }
      });
    }
  }

  /**
   * Check if an input element is a chat input
   */
  private isChatInput(input: HTMLInputElement): boolean {
    const chatSelectors = [
      '.chat-input',
      '.message-input',
      '[placeholder*="message"]',
      '[placeholder*="chat"]',
      '[name="message"]',
      '[name="chat"]'
    ];

    return chatSelectors.some(selector => input.matches(selector));
  }

  /**
   * Record feedback in history and persist
   */
  private recordFeedback(feedback: UserFeedback): void {
    this.feedbackHistory.set(feedback.id, feedback);
    
    // Keep only recent feedback (last 1000 entries)
    if (this.feedbackHistory.size > 1000) {
      const entries = Array.from(this.feedbackHistory.entries());
      entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
      
      this.feedbackHistory.clear();
      entries.slice(0, 1000).forEach(([id, feedback]) => {
        this.feedbackHistory.set(id, feedback);
      });
    }

    this.persistFeedback();
  }

  /**
   * Persist feedback to local storage
   */
  private persistFeedback(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const data = {
          feedback: Array.from(this.feedbackHistory.values()),
          timestamp: Date.now()
        };
        localStorage.setItem('nld_user_feedback', JSON.stringify(data));
      }
    } catch (error) {
      console.warn('NLD: Failed to persist user feedback', error);
    }
  }

  /**
   * Load persisted feedback
   */
  private loadPersistedFeedback(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('nld_user_feedback');
        if (stored) {
          const data = JSON.parse(stored);
          data.feedback?.forEach((feedback: UserFeedback) => {
            this.feedbackHistory.set(feedback.id, feedback);
          });
        }
      }
    } catch (error) {
      console.warn('NLD: Failed to load persisted feedback', error);
    }
  }

  /**
   * Notify listeners of new feedback
   */
  private notifyListeners(feedback: UserFeedback): void {
    this.listeners.forEach(listener => {
      try {
        listener(feedback);
      } catch (error) {
        console.error('NLD: Feedback listener error', error);
      }
    });

    // Dispatch custom event for components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nld:user_feedback', {
        detail: feedback
      }));
    }
  }

  // Public API

  /**
   * Add feedback listener
   */
  public addListener(listener: (feedback: UserFeedback) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Remove feedback listener
   */
  public removeListener(listener: (feedback: UserFeedback) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Start listening for feedback
   */
  public startListening(): void {
    this.isListening = true;
    this.loadPersistedFeedback();
  }

  /**
   * Stop listening for feedback
   */
  public stopListening(): void {
    this.isListening = false;
  }

  /**
   * Get feedback history
   */
  public getFeedbackHistory(): UserFeedback[] {
    return Array.from(this.feedbackHistory.values())
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get feedback by sentiment
   */
  public getFeedbackBySentiment(sentiment: UserFeedback['sentiment']): UserFeedback[] {
    return this.getFeedbackHistory().filter(f => f.sentiment === sentiment);
  }

  /**
   * Get recent negative feedback (potential failures)
   */
  public getRecentFailures(hours: number = 1): UserFeedback[] {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    return this.getFeedbackHistory()
      .filter(f => f.timestamp > cutoff && f.sentiment === 'negative');
  }

  /**
   * Add custom trigger pattern
   */
  public addTrigger(trigger: FeedbackTrigger): void {
    this.triggers.push(trigger);
  }

  /**
   * Get feedback statistics
   */
  public getStats(): {
    total: number;
    positive: number;
    negative: number;
    neutral: number;
    successRate: number;
  } {
    const feedback = this.getFeedbackHistory();
    const positive = feedback.filter(f => f.sentiment === 'positive').length;
    const negative = feedback.filter(f => f.sentiment === 'negative').length;
    const neutral = feedback.filter(f => f.sentiment === 'neutral').length;
    
    return {
      total: feedback.length,
      positive,
      negative,
      neutral,
      successRate: feedback.length > 0 ? positive / feedback.length : 0
    };
  }

  /**
   * Export feedback data for training
   */
  public exportForTraining(): any {
    return {
      feedback: this.getFeedbackHistory(),
      triggers: this.triggers,
      stats: this.getStats(),
      exportTime: Date.now()
    };
  }
}

export default UserFeedbackCapture;