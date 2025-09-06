/**
 * SPARC REFINEMENT PHASE: Comment System Fix Implementation
 * TDD London School Approach with Real Browser Testing
 */

const request = require('supertest');
const { expect } = require('chai');

class CommentSystemSPARCFix {
  constructor(app, databaseService) {
    this.app = app;
    this.db = databaseService;
  }

  /**
   * SPARC PSEUDOCODE IMPLEMENTATION: Comment Posting Algorithm
   */
  async createComment(postId, content, authorAgent, parentId = null) {
    try {
      // 1. Validate post exists
      const post = await this.db.getPost(postId);
      if (!post) {
        throw new Error('Post not found');
      }

      // 2. Parse content for agent mentions and hashtags
      const mentions = this.extractMentions(content);
      const hashtags = this.extractHashtags(content);

      // 3. Calculate thread depth for nested replies
      let threadDepth = 0;
      let threadPath = postId;
      
      if (parentId) {
        const parentComment = await this.db.getComment(parentId);
        if (parentComment) {
          threadDepth = (parentComment.threadDepth || 0) + 1;
          threadPath = `${parentComment.threadPath || postId}/${parentId}`;
        }
      }

      // 4. Create comment with agent-focused metadata
      const comment = {
        id: this.generateCommentId(),
        postId,
        content,
        authorAgent,
        parentId,
        threadDepth,
        threadPath,
        mentions,
        hashtags,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {
          agentType: this.getAgentType(authorAgent),
          responseContext: this.analyzeResponseContext(content, mentions)
        }
      };

      // 5. Store in database with proper relationships
      const savedComment = await this.db.createComment(comment);

      // 6. Notify mentioned agents (agent-to-agent communication)
      await this.notifyMentionedAgents(mentions, savedComment);

      // 7. Update post engagement metrics
      await this.updatePostEngagement(postId, 'comment');

      return {
        success: true,
        data: savedComment,
        agentCommunication: {
          mentions: mentions.length,
          threadDepth,
          contextual: mentions.length > 0
        }
      };

    } catch (error) {
      return this.handleCommentError(error);
    }
  }

  /**
   * SPARC AGENT REPLY GENERATION: Contextual agent responses
   */
  async generateAgentResponse(commentId, respondingAgent) {
    try {
      const parentComment = await this.db.getComment(commentId);
      if (!parentComment) {
        throw new Error('Parent comment not found');
      }

      // Agent-specific response templates based on agent type
      const responseTemplates = {
        'TechReviewer': [
          'From a technical perspective, {context}. The implementation approach {analysis}.',
          'I agree with the analysis on {topic}. Consider also {suggestion}.',
          'This aligns with best practices for {domain}. Worth noting {observation}.'
        ],
        'SystemValidator': [
          'Validation confirms {finding}. System integrity {status}.',
          'Performance metrics show {metric}. Recommend {action}.',
          'Security assessment indicates {result}. Consider {mitigation}.'
        ],
        'CodeAuditor': [
          'Code review reveals {observation}. Quality score: {score}.',
          'Architecture follows standards with {compliance}. Suggest {improvement}.',
          'Testing coverage at {percentage}%. Areas for enhancement: {areas}.'
        ]
      };

      const templates = responseTemplates[respondingAgent] || responseTemplates['TechReviewer'];
      const template = templates[Math.floor(Math.random() * templates.length)];

      // Generate contextual response based on parent comment
      const context = this.analyzeCommentContext(parentComment);
      const response = this.fillResponseTemplate(template, context);

      // Create response comment
      return await this.createComment(
        parentComment.postId, 
        response, 
        respondingAgent, 
        parentComment.id
      );

    } catch (error) {
      return this.handleCommentError(error);
    }
  }

  /**
   * SPARC ERROR HANDLING STRATEGY
   */
  handleCommentError(error) {
    const errorMap = {
      'Post not found': { code: 'POST_NOT_FOUND', status: 404 },
      'Parent comment not found': { code: 'PARENT_NOT_FOUND', status: 404 },
      'Invalid agent': { code: 'AGENT_INVALID', status: 400 },
      'Content too long': { code: 'CONTENT_LENGTH', status: 400 }
    };

    const mappedError = errorMap[error.message] || { 
      code: 'INTERNAL_ERROR', 
      status: 500 
    };

    console.error('Comment system error:', error);

    return {
      success: false,
      error: mappedError.code,
      message: error.message,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * AGENT-FOCUSED UTILITY METHODS
   */
  extractMentions(content) {
    const mentionRegex = /@([a-zA-Z0-9_]+)/g;
    const mentions = [];
    let match;
    
    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.push(match[1]);
    }
    
    return [...new Set(mentions)]; // Remove duplicates
  }

  extractHashtags(content) {
    const hashtagRegex = /#([a-zA-Z0-9_]+)/g;
    const hashtags = [];
    let match;
    
    while ((match = hashtagRegex.exec(content)) !== null) {
      hashtags.push(match[1]);
    }
    
    return [...new Set(hashtags)]; // Remove duplicates
  }

  generateCommentId() {
    return `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  getAgentType(agentName) {
    const agentTypes = {
      'TechReviewer': 'technical_analyst',
      'SystemValidator': 'system_validator', 
      'CodeAuditor': 'code_auditor',
      'PerformanceAnalyst': 'performance_analyst',
      'QualityAssurance': 'quality_assurance'
    };
    
    return agentTypes[agentName] || 'generic_agent';
  }

  analyzeResponseContext(content, mentions) {
    return {
      hasQuestions: content.includes('?'),
      hasMentions: mentions.length > 0,
      isAnalytical: /analysis|review|assessment|evaluation/i.test(content),
      isTechnical: /code|implementation|system|architecture/i.test(content),
      urgency: /urgent|critical|important|asap/i.test(content) ? 'high' : 'normal'
    };
  }

  analyzeCommentContext(comment) {
    return {
      topic: this.extractMainTopic(comment.content),
      sentiment: this.analyzeSentiment(comment.content),
      technicalTerms: this.extractTechnicalTerms(comment.content),
      authorType: comment.metadata?.agentType || 'unknown'
    };
  }

  fillResponseTemplate(template, context) {
    return template
      .replace('{context}', context.topic || 'this implementation')
      .replace('{analysis}', 'shows solid engineering principles')
      .replace('{topic}', context.topic || 'the approach')
      .replace('{suggestion}', 'performance optimization')
      .replace('{observation}', 'adherence to best practices')
      .replace('{finding}', 'system stability')
      .replace('{status}', 'appears robust')
      .replace('{metric}', 'acceptable performance levels')
      .replace('{action}', 'monitoring implementation')
      .replace('{result}', 'no significant vulnerabilities')
      .replace('{mitigation}', 'enhanced logging');
  }

  extractMainTopic(content) {
    const topicKeywords = {
      'implementation': /implement|build|create|develop/i,
      'performance': /performance|speed|optimization|efficiency/i,
      'security': /security|secure|vulnerability|protection/i,
      'architecture': /architecture|design|structure|pattern/i,
      'testing': /test|testing|validation|verification/i
    };

    for (const [topic, regex] of Object.entries(topicKeywords)) {
      if (regex.test(content)) return topic;
    }

    return 'general discussion';
  }

  analyzeSentiment(content) {
    if (/excellent|great|good|solid|impressive/i.test(content)) return 'positive';
    if (/issue|problem|concern|error|fail/i.test(content)) return 'negative';
    return 'neutral';
  }

  extractTechnicalTerms(content) {
    const technicalTerms = content.match(/\b(API|database|server|client|authentication|optimization|performance|security|architecture|implementation|algorithm|framework|library|method|function|class|module|component)\b/gi);
    return technicalTerms ? [...new Set(technicalTerms.map(term => term.toLowerCase()))] : [];
  }

  async notifyMentionedAgents(mentions, comment) {
    // WebSocket notification implementation for agent-to-agent communication
    for (const agentName of mentions) {
      // In a real implementation, this would send WebSocket notifications
      console.log(`🤖 Notifying agent ${agentName} of mention in comment ${comment.id}`);
    }
  }

  async updatePostEngagement(postId, action) {
    try {
      await this.db.updatePostEngagement(postId, action);
    } catch (error) {
      console.error('Failed to update post engagement:', error);
    }
  }
}

/**
 * SPARC TDD LONDON SCHOOL TEST SUITE
 */
class CommentSystemTests {
  constructor(app, commentSystem) {
    this.app = app;
    this.commentSystem = commentSystem;
  }

  async runAllTests() {
    console.log('🧪 Running SPARC Comment System Test Suite...');
    
    await this.testCommentCreation();
    await this.testAgentMentions();
    await this.testThreadedReplies();
    await this.testErrorHandling();
    await this.testAgentResponseGeneration();
    
    console.log('✅ SPARC Comment System Test Suite Complete');
  }

  async testCommentCreation() {
    console.log('🧪 Testing comment creation...');
    
    // Test successful comment creation
    const response = await request(this.app)
      .post('/api/posts/test-post/comments')
      .send({
        content: 'This is a test comment from @TechReviewer #testing',
        authorAgent: 'TechReviewer'
      })
      .expect(201);

    expect(response.body.success).to.be.true;
    expect(response.body.data.content).to.include('test comment');
    expect(response.body.data.authorAgent).to.equal('TechReviewer');
    expect(response.body.agentCommunication.mentions).to.equal(1);
    
    console.log('✅ Comment creation test passed');
  }

  async testAgentMentions() {
    console.log('🧪 Testing agent mentions...');
    
    const mentions = this.commentSystem.extractMentions('Hello @TechReviewer and @SystemValidator, please review #urgent');
    expect(mentions).to.have.members(['TechReviewer', 'SystemValidator']);
    
    const hashtags = this.commentSystem.extractHashtags('This is #urgent and #critical #testing');
    expect(hashtags).to.have.members(['urgent', 'critical', 'testing']);
    
    console.log('✅ Agent mentions test passed');
  }

  async testThreadedReplies() {
    console.log('🧪 Testing threaded replies...');
    
    // Create parent comment
    const parentResponse = await request(this.app)
      .post('/api/posts/test-post/comments')
      .send({
        content: 'Parent comment',
        authorAgent: 'TechReviewer'
      })
      .expect(201);

    const parentId = parentResponse.body.data.id;

    // Create reply
    const replyResponse = await request(this.app)
      .post('/api/comments/' + parentId + '/reply')
      .send({
        content: 'Reply to parent',
        authorAgent: 'SystemValidator'
      })
      .expect(201);

    expect(replyResponse.body.data.parentId).to.equal(parentId);
    expect(replyResponse.body.data.threadDepth).to.equal(1);
    
    console.log('✅ Threaded replies test passed');
  }

  async testErrorHandling() {
    console.log('🧪 Testing error handling...');
    
    // Test comment on non-existent post
    const response = await request(this.app)
      .post('/api/posts/non-existent/comments')
      .send({
        content: 'Comment on missing post',
        authorAgent: 'TestAgent'
      })
      .expect(404);

    expect(response.body.success).to.be.false;
    expect(response.body.error).to.equal('POST_NOT_FOUND');
    
    console.log('✅ Error handling test passed');
  }

  async testAgentResponseGeneration() {
    console.log('🧪 Testing agent response generation...');
    
    // Create a comment first
    const commentResponse = await request(this.app)
      .post('/api/posts/test-post/comments')
      .send({
        content: 'What do you think about this implementation approach?',
        authorAgent: 'TechReviewer'
      })
      .expect(201);

    const commentId = commentResponse.body.data.id;

    // Generate agent response
    const agentResponse = await request(this.app)
      .post('/api/comments/' + commentId + '/generate-response')
      .send({
        respondingAgent: 'SystemValidator'
      })
      .expect(201);

    expect(agentResponse.body.success).to.be.true;
    expect(agentResponse.body.data.parentId).to.equal(commentId);
    expect(agentResponse.body.data.authorAgent).to.equal('SystemValidator');
    
    console.log('✅ Agent response generation test passed');
  }
}

module.exports = { CommentSystemSPARCFix, CommentSystemTests };