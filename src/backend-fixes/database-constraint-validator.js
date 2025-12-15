/**
 * SPARC Database Constraint Validator
 * Prevents SQLite constraint violations through pre-validation
 * Part of SPARC Phase 4: Refinement - Database Integrity
 */

class DatabaseConstraintValidator {
  constructor() {
    this.schemas = {
      agent_posts: {
        title: { type: 'string', required: true, maxLength: 500 },
        content: { type: 'string', required: true, maxLength: 10000 },
        author_agent: { type: 'string', required: true, maxLength: 255 }
      },
      agents: {
        name: { type: 'string', required: true, maxLength: 255 },
        display_name: { type: 'string', required: true, maxLength: 255 }
      },
      activities: {
        type: { type: 'string', required: true, maxLength: 100 },
        description: { type: 'string', required: true, maxLength: 1000 }
      }
    };
  }

  validateAgentPost(postData) {
    const errors = [];

    // Validate title
    if (!postData.title || typeof postData.title !== 'string') {
      errors.push('title is required and must be a string');
    } else if (postData.title.trim().length === 0) {
      errors.push('title cannot be empty');
    } else if (postData.title.length > 500) {
      errors.push('title must be 500 characters or less');
    }

    // Validate content
    if (!postData.content || typeof postData.content !== 'string') {
      errors.push('content is required and must be a string');
    } else if (postData.content.trim().length === 0) {
      errors.push('content cannot be empty');
    } else if (postData.content.length > 10000) {
      errors.push('content must be 10000 characters or less');
    }

    // Validate author_agent
    if (!postData.author_agent || typeof postData.author_agent !== 'string') {
      errors.push('author_agent is required and must be a string');
    } else if (postData.author_agent.trim().length === 0) {
      errors.push('author_agent cannot be empty');
    } else if (postData.author_agent.length > 255) {
      errors.push('author_agent must be 255 characters or less');
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: this.sanitizeAgentPost(postData)
    };
  }

  sanitizeAgentPost(postData) {
    return {
      title: postData.title ? postData.title.trim() : '',
      content: postData.content ? postData.content.trim() : '',
      author_agent: postData.author_agent ? postData.author_agent.trim() : '',
      metadata: postData.metadata ? JSON.stringify(postData.metadata) : '{}',
      likes: parseInt(postData.likes) || 0,
      comments: parseInt(postData.comments) || 0
    };
  }

  validateAgent(agentData) {
    const errors = [];

    // Validate name
    if (!agentData.name || typeof agentData.name !== 'string') {
      errors.push('name is required and must be a string');
    } else if (agentData.name.trim().length === 0) {
      errors.push('name cannot be empty');
    }

    // Validate display_name
    if (!agentData.display_name || typeof agentData.display_name !== 'string') {
      errors.push('display_name is required and must be a string');
    } else if (agentData.display_name.trim().length === 0) {
      errors.push('display_name cannot be empty');
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: this.sanitizeAgent(agentData)
    };
  }

  sanitizeAgent(agentData) {
    return {
      id: agentData.id || this.generateId(),
      name: agentData.name ? agentData.name.trim() : '',
      display_name: agentData.display_name ? agentData.display_name.trim() : '',
      description: agentData.description ? agentData.description.trim() : null,
      system_prompt: agentData.system_prompt ? agentData.system_prompt.trim() : null,
      avatar_color: agentData.avatar_color || '#3B82F6',
      capabilities: agentData.capabilities ? JSON.stringify(agentData.capabilities) : '[]',
      status: agentData.status || 'active'
    };
  }

  generateId() {
    return 'agent_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Express middleware for request validation
  validateRequestMiddleware(tableName) {
    return (req, res, next) => {
      let validation;

      switch (tableName) {
        case 'agent_posts':
          validation = this.validateAgentPost(req.body);
          break;
        case 'agents':
          validation = this.validateAgent(req.body);
          break;
        default:
          return res.status(400).json({
            error: 'Unknown table for validation',
            table: tableName
          });
      }

      if (!validation.isValid) {
        console.error(`❌ SPARC VALIDATION: ${tableName} validation failed:`, validation.errors);
        return res.status(400).json({
          error: 'Validation failed',
          details: validation.errors,
          table: tableName
        });
      }

      // Replace request body with sanitized data
      req.body = validation.sanitizedData;
      console.log(`✅ SPARC VALIDATION: ${tableName} data validated and sanitized`);
      next();
    };
  }
}

export { DatabaseConstraintValidator };