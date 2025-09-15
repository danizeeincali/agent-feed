/**
 * AviPersonality Module Tests - London School TDD
 * 
 * This test suite focuses on behavioral responses and personality modeling:
 * 1. Testing personality trait consistency
 * 2. Verifying contextual response adaptation
 * 3. Testing emotional intelligence patterns
 * 4. Validating agent specialization behaviors
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AviDMSection } from '../../components/posting-interface/AviDMSection';
import { createMockAviDMService } from '../mocks/avi-dm-service.mock';

// Mock personality engine
class MockPersonalityEngine {
  generateResponse = jest.fn();
  adaptToContext = jest.fn();
  getPersonalityTraits = jest.fn();
  updateEmotionalState = jest.fn();
  analyzeUserSentiment = jest.fn();
  selectResponseTone = jest.fn();
}

// Mock agent personality profiles
const AGENT_PERSONALITIES = {
  'tech-reviewer': {
    traits: {
      analytical: 0.9,
      detail_oriented: 0.95,
      constructive: 0.8,
      collaborative: 0.7,
      systematic: 0.9
    },
    communication_style: {
      tone: 'professional',
      verbosity: 'concise',
      technical_depth: 'high',
      feedback_style: 'constructive'
    },
    specializations: ['code_review', 'architecture', 'best_practices'],
    response_patterns: {
      greeting: 'Hello! I\'m ready to review your code and provide architectural guidance.',
      question: 'What specific aspect would you like me to focus on?',
      code_review: 'Let me analyze this code for potential improvements...',
      encouragement: 'Great work! Here are some suggestions to make it even better.'
    }
  },
  'system-validator': {
    traits: {
      thorough: 0.95,
      cautious: 0.9,
      methodical: 0.9,
      quality_focused: 0.95,
      risk_aware: 0.8
    },
    communication_style: {
      tone: 'careful',
      verbosity: 'detailed',
      technical_depth: 'high',
      feedback_style: 'comprehensive'
    },
    specializations: ['testing', 'validation', 'quality_assurance'],
    response_patterns: {
      greeting: 'Hello! I\'m here to help ensure your system meets all quality standards.',
      validation: 'Let me run through our validation checklist...',
      concerns: 'I\'ve identified some areas that need attention.',
      approval: 'Excellent! All validation criteria have been met.'
    }
  }
};

// Mock the personality service
jest.mock('../../services/AviPersonalityService', () => ({
  AviPersonalityService: jest.fn().mockImplementation(() => new MockPersonalityEngine())
}));

// Mock the AviDMService
jest.mock('../../services/AviDMService');

describe('AviPersonality Module - London School TDD', () => {
  let mockPersonalityEngine: MockPersonalityEngine;
  let mockAviService: any;
  let user: any;

  beforeEach(() => {
    mockPersonalityEngine = new MockPersonalityEngine();
    mockAviService = createMockAviDMService();
    
    // Mock service constructor
    const { AviDMService } = require('../../services/AviDMService');
    AviDMService.mockImplementation(() => mockAviService);
    
    user = userEvent.setup();
    
    // Setup default personality responses
    mockPersonalityEngine.getPersonalityTraits.mockImplementation((agentId) => 
      AGENT_PERSONALITIES[agentId as keyof typeof AGENT_PERSONALITIES]?.traits || {}
    );
    
    mockPersonalityEngine.generateResponse.mockResolvedValue({
      content: 'Personalized response based on agent traits',
      tone: 'professional',
      confidence: 0.8
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Agent Personality Consistency', () => {
    it('should maintain consistent personality traits across interactions', async () => {
      render(<AviDMSection />);
      
      // Select TechReviewer agent
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      await user.click(techReviewerButton);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Message TechReviewer...')).toBeInTheDocument();
      });
      
      // Verify initial greeting reflects personality
      expect(screen.getByText(/Hello! I'm TechReviewer/)).toBeInTheDocument();
      
      // Send multiple messages to test consistency
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      const testMessages = [
        'Please review this function',
        'What about this architecture?',
        'Any concerns with this approach?'
      ];
      
      for (const message of testMessages) {
        await user.clear(messageInput);
        await user.type(messageInput, message);
        await user.click(sendButton);
        
        await waitFor(() => {
          expect(mockAviService.sendMessage).toHaveBeenCalledWith(
            message,
            expect.objectContaining({
              personalityProfile: expect.objectContaining({
                agentId: 'tech-reviewer',
                traits: expect.any(Object)
              })
            })
          );
        });
      }
    });

    it('should demonstrate different personality traits between agents', async () => {
      render(<AviDMSection />);
      
      // Test TechReviewer personality
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      await user.click(techReviewerButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Code Review & Architecture/)).toBeInTheDocument();
      });
      
      // Switch to SystemValidator
      const changeButton = screen.getByText('Change');
      await user.click(changeButton);
      
      await waitFor(() => {
        expect(screen.getByText('Select Agent to Message')).toBeInTheDocument();
      });
      
      const systemValidatorButton = screen.getByText('SystemValidator').closest('button')!;
      await user.click(systemValidatorButton);
      
      await waitFor(() => {
        expect(screen.getByText(/System Testing & Validation/)).toBeInTheDocument();
      });
      
      // Verify different personality presentation
      expect(screen.getByText(/Hello! I'm SystemValidator/)).toBeInTheDocument();
    });

    it('should adapt response style based on agent specialization', async () => {
      render(<AviDMSection />);
      
      // Select QualityAssurance agent
      const qaButton = screen.getByText('QualityAssurance').closest('button')!;
      await user.click(qaButton);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Message QualityAssurance...')).toBeInTheDocument();
      });
      
      const messageInput = screen.getByPlaceholderText('Message QualityAssurance...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      // Send message related to their specialization
      await user.type(messageInput, 'Can you help test this feature?');
      await user.click(sendButton);
      
      // Mock specialized response generation
      mockPersonalityEngine.generateResponse.mockResolvedValueOnce({
        content: 'Absolutely! Let me create a comprehensive test plan for this feature. I\'ll focus on edge cases and user scenarios.',
        tone: 'methodical',
        confidence: 0.9,
        specialization_applied: 'quality_assurance'
      });
      
      await waitFor(() => {
        expect(mockPersonalityEngine.generateResponse).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Can you help test this feature?',
            agentId: 'quality-assurance',
            context: expect.any(Object)
          })
        );
      });
    });
  });

  describe('Contextual Response Adaptation', () => {
    beforeEach(async () => {
      render(<AviDMSection />);
      
      // Select agent
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      await user.click(techReviewerButton);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Message TechReviewer...')).toBeInTheDocument();
      });
    });

    it('should adapt tone based on message urgency', async () => {
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      // Mock urgency detection
      mockPersonalityEngine.analyzeUserSentiment.mockResolvedValue({
        urgency: 'high',
        emotion: 'stressed',
        confidence: 0.8
      });
      
      mockPersonalityEngine.selectResponseTone.mockReturnValue('urgent_supportive');
      
      await user.type(messageInput, 'URGENT: Production system is failing! Need immediate help!');
      await user.click(sendButton);
      
      await waitFor(() => {
        expect(mockPersonalityEngine.analyzeUserSentiment).toHaveBeenCalledWith(
          'URGENT: Production system is failing! Need immediate help!'
        );
        expect(mockPersonalityEngine.selectResponseTone).toHaveBeenCalledWith(
          expect.objectContaining({
            urgency: 'high',
            emotion: 'stressed'
          }),
          expect.any(Object)
        );
      });
    });

    it('should maintain conversation context across multiple exchanges', async () => {
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      // First message - establish context
      await user.type(messageInput, 'I\'m working on a React component with performance issues');
      await user.click(sendButton);
      
      await waitFor(() => {
        expect(mockAviService.sendMessage).toHaveBeenCalled();
      });
      
      // Second message - build on context
      await user.clear(messageInput);
      await user.type(messageInput, 'It re-renders too frequently');
      await user.click(sendButton);
      
      // Personality engine should adapt to context
      await waitFor(() => {
        expect(mockPersonalityEngine.adaptToContext).toHaveBeenCalledWith(
          expect.objectContaining({
            previousMessages: expect.arrayContaining([
              expect.objectContaining({
                content: expect.stringContaining('React component')
              })
            ]),
            currentMessage: 'It re-renders too frequently',
            contextType: 'technical_support'
          })
        );
      });
    });

    it('should adjust technical depth based on user expertise level', async () => {
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      // Mock expertise level detection
      mockPersonalityEngine.analyzeUserSentiment.mockResolvedValue({
        technical_level: 'beginner',
        confidence: 0.7
      });
      
      await user.type(messageInput, 'I\'m new to React. Can you help me understand components?');
      await user.click(sendButton);
      
      // Should adapt to beginner level
      await waitFor(() => {
        expect(mockPersonalityEngine.generateResponse).toHaveBeenCalledWith(
          expect.objectContaining({
            userProfile: expect.objectContaining({
              technical_level: 'beginner'
            }),
            response_style: expect.objectContaining({
              technical_depth: 'simplified',
              examples: true,
              explanatory: true
            })
          })
        );
      });
    });

    it('should handle emotional states in user messages', async () => {
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      // Mock emotional state detection
      mockPersonalityEngine.analyzeUserSentiment.mockResolvedValue({
        emotion: 'frustrated',
        intensity: 0.8,
        context: 'technical_difficulty'
      });
      
      mockPersonalityEngine.updateEmotionalState.mockReturnValue({
        response_approach: 'empathetic_supportive',
        tone_adjustment: 'calming',
        priority: 'reassurance_first'
      });
      
      await user.type(messageInput, 'I\'ve been stuck on this bug for hours and nothing works!');
      await user.click(sendButton);
      
      await waitFor(() => {
        expect(mockPersonalityEngine.updateEmotionalState).toHaveBeenCalledWith(
          expect.objectContaining({
            user_emotion: 'frustrated',
            intensity: 0.8,
            agent_response_needed: 'empathetic_support'
          })
        );
      });
    });
  });

  describe('Agent Specialization Behaviors', () => {
    it('should demonstrate CodeAuditor security-focused responses', async () => {
      render(<AviDMSection />);
      
      const codeAuditorButton = screen.getByText('CodeAuditor').closest('button')!;
      await user.click(codeAuditorButton);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Message CodeAuditor...')).toBeInTheDocument();
      });
      
      const messageInput = screen.getByPlaceholderText('Message CodeAuditor...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      // Mock security-focused personality traits
      mockPersonalityEngine.getPersonalityTraits.mockReturnValue({
        security_focused: 0.95,
        risk_assessment: 0.9,
        compliance_aware: 0.85,
        detail_oriented: 0.9
      });
      
      await user.type(messageInput, 'Can you review this authentication code?');
      await user.click(sendButton);
      
      // Should apply security specialization
      await waitFor(() => {
        expect(mockPersonalityEngine.generateResponse).toHaveBeenCalledWith(
          expect.objectContaining({
            specialization_filters: expect.arrayContaining(['security', 'code_quality']),
            focus_areas: expect.arrayContaining(['authentication', 'input_validation', 'encryption'])
          })
        );
      });
    });

    it('should demonstrate PerformanceAnalyst optimization-focused behavior', async () => {
      render(<AviDMSection />);
      
      const perfAnalystButton = screen.getByText('PerformanceAnalyst').closest('button')!;
      await user.click(perfAnalystButton);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Message PerformanceAnalyst...')).toBeInTheDocument();
      });
      
      const messageInput = screen.getByPlaceholderText('Message PerformanceAnalyst...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      // Mock performance-focused traits
      mockPersonalityEngine.getPersonalityTraits.mockReturnValue({
        performance_focused: 0.95,
        metrics_driven: 0.9,
        optimization_minded: 0.95,
        analytical: 0.85
      });
      
      await user.type(messageInput, 'My app is loading slowly. Can you help?');
      await user.click(sendButton);
      
      // Should apply performance specialization
      await waitFor(() => {
        expect(mockPersonalityEngine.generateResponse).toHaveBeenCalledWith(
          expect.objectContaining({
            analysis_focus: expect.arrayContaining(['load_times', 'bundle_size', 'rendering', 'network']),
            metric_priorities: expect.arrayContaining(['performance', 'user_experience'])
          })
        );
      });
    });

    it('should adapt communication style based on agent availability status', async () => {
      render(<AviDMSection />);
      
      // Test with 'away' status agent
      const codeAuditorButton = screen.getByText('CodeAuditor').closest('button')!;
      await user.click(codeAuditorButton);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Message CodeAuditor...')).toBeInTheDocument();
      });
      
      // Mock status-based personality adjustment
      mockPersonalityEngine.adaptToContext.mockResolvedValue({
        availability_message: 'I\'m currently handling other tasks but will prioritize security reviews.',
        response_delay_expectation: 'longer_than_usual',
        urgency_threshold: 'high_only'
      });
      
      const messageInput = screen.getByPlaceholderText('Message CodeAuditor...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      await user.type(messageInput, 'Quick security question');
      await user.click(sendButton);
      
      await waitFor(() => {
        expect(mockPersonalityEngine.adaptToContext).toHaveBeenCalledWith(
          expect.objectContaining({
            agent_status: 'away',
            message_urgency: 'normal',
            availability_context: expect.any(Object)
          })
        );
      });
    });
  });

  describe('Emotional Intelligence and Empathy', () => {
    beforeEach(async () => {
      render(<AviDMSection />);
      
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      await user.click(techReviewerButton);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Message TechReviewer...')).toBeInTheDocument();
      });
    });

    it('should recognize and respond to user celebration', async () => {
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      // Mock positive sentiment detection
      mockPersonalityEngine.analyzeUserSentiment.mockResolvedValue({
        emotion: 'excited',
        context: 'achievement',
        confidence: 0.9
      });
      
      mockPersonalityEngine.generateResponse.mockResolvedValue({
        content: 'Congratulations! That\'s fantastic progress. I\'d love to hear more about what you accomplished!',
        tone: 'enthusiastic_supportive',
        emotional_response: 'celebratory'
      });
      
      await user.type(messageInput, 'I finally fixed the bug! The tests are all passing now!');
      await user.click(sendButton);
      
      await waitFor(() => {
        expect(mockPersonalityEngine.analyzeUserSentiment).toHaveBeenCalledWith(
          expect.stringContaining('fixed the bug')
        );
        expect(mockPersonalityEngine.generateResponse).toHaveBeenCalledWith(
          expect.objectContaining({
            emotional_context: expect.objectContaining({
              user_emotion: 'excited',
              appropriate_response: 'celebratory'
            })
          })
        );
      });
    });

    it('should provide encouraging responses to struggling users', async () => {
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      // Mock discouragement detection
      mockPersonalityEngine.analyzeUserSentiment.mockResolvedValue({
        emotion: 'discouraged',
        intensity: 0.7,
        context: 'technical_struggle'
      });
      
      mockPersonalityEngine.updateEmotionalState.mockReturnValue({
        response_strategy: 'encouragement_first',
        technical_help: 'simplified_approach',
        motivational_elements: true
      });
      
      await user.type(messageInput, 'I keep making mistakes and feel like I\'ll never get this right');
      await user.click(sendButton);
      
      await waitFor(() => {
        expect(mockPersonalityEngine.updateEmotionalState).toHaveBeenCalledWith(
          expect.objectContaining({
            user_emotion: 'discouraged',
            support_needed: 'encouragement_and_guidance',
            response_priority: 'emotional_support_first'
          })
        );
      });
    });

    it('should maintain professional empathy without being overly personal', async () => {
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      // Mock boundary-appropriate empathy
      mockPersonalityEngine.generateResponse.mockResolvedValue({
        content: 'I understand this can be challenging. Let\'s break it down into manageable steps.',
        tone: 'professional_supportive',
        empathy_level: 'appropriate_professional',
        boundary_maintained: true
      });
      
      await user.type(messageInput, 'This project is stressing me out and affecting my personal life');
      await user.click(sendButton);
      
      await waitFor(() => {
        expect(mockPersonalityEngine.generateResponse).toHaveBeenCalledWith(
          expect.objectContaining({
            empathy_constraints: expect.objectContaining({
              maintain_professional_boundary: true,
              focus_on_technical_solutions: true,
              avoid_personal_advice: true
            })
          })
        );
      });
    });
  });

  describe('Learning and Adaptation', () => {
    it('should learn from user feedback and adjust responses', async () => {
      render(<AviDMSection />);
      
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      await user.click(techReviewerButton);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Message TechReviewer...')).toBeInTheDocument();
      });
      
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      // Simulate feedback learning
      mockPersonalityEngine.adaptToContext.mockImplementation((context) => {
        if (context.feedback_received) {
          return {
            personality_adjustment: {
              trait_modification: context.feedback_received,
              response_style_update: 'more_detailed'
            }
          };
        }
        return {};
      });
      
      // First interaction
      await user.type(messageInput, 'Can you review this code?');
      await user.click(sendButton);
      
      // Simulate user feedback
      await user.clear(messageInput);
      await user.type(messageInput, 'Your previous response was too brief. Can you provide more detailed explanations?');
      await user.click(sendButton);
      
      await waitFor(() => {
        expect(mockPersonalityEngine.adaptToContext).toHaveBeenCalledWith(
          expect.objectContaining({
            feedback_received: expect.objectContaining({
              verbosity_preference: 'more_detailed',
              explanation_depth: 'increased'
            })
          })
        );
      });
    });

    it('should adapt personality based on successful interaction patterns', async () => {
      render(<AviDMSection />);
      
      const systemValidatorButton = screen.getByText('SystemValidator').closest('button')!;
      await user.click(systemValidatorButton);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Message SystemValidator...')).toBeInTheDocument();
      });
      
      // Mock successful interaction tracking
      mockPersonalityEngine.adaptToContext.mockResolvedValue({
        successful_patterns: {
          response_style: 'methodical_with_examples',
          communication_preference: 'step_by_step',
          user_satisfaction: 0.9
        },
        personality_reinforcement: {
          enhance_traits: ['methodical', 'thorough'],
          communication_adjustments: ['more_examples', 'clearer_steps']
        }
      });
      
      const messageInput = screen.getByPlaceholderText('Message SystemValidator...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      await user.type(messageInput, 'That validation approach worked perfectly! Can you help with another system?');
      await user.click(sendButton);
      
      await waitFor(() => {
        expect(mockPersonalityEngine.adaptToContext).toHaveBeenCalledWith(
          expect.objectContaining({
            interaction_success: true,
            user_satisfaction_indicators: expect.arrayContaining(['worked perfectly']),
            reinforcement_learning: true
          })
        );
      });
    });
  });

  describe('Multi-Agent Personality Coordination', () => {
    it('should coordinate personality traits when multiple agents are involved', async () => {
      render(<AviDMSection />);
      
      // Mock multi-agent coordination
      mockPersonalityEngine.adaptToContext.mockResolvedValue({
        multi_agent_context: {
          primary_agent: 'tech-reviewer',
          supporting_agents: ['system-validator', 'quality-assurance'],
          personality_coordination: {
            avoid_redundancy: true,
            complementary_strengths: true,
            unified_communication_style: 'professional_collaborative'
          }
        }
      });
      
      const techReviewerButton = screen.getByText('TechReviewer').closest('button')!;
      await user.click(techReviewerButton);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Message TechReviewer...')).toBeInTheDocument();
      });
      
      const messageInput = screen.getByPlaceholderText('Message TechReviewer...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      await user.type(messageInput, 'I need code review, testing, and quality assurance for this feature');
      await user.click(sendButton);
      
      await waitFor(() => {
        expect(mockPersonalityEngine.adaptToContext).toHaveBeenCalledWith(
          expect.objectContaining({
            multi_agent_scenario: true,
            coordination_required: ['code_review', 'testing', 'quality_assurance'],
            personality_harmonization: true
          })
        );
      });
    });
  });
});
