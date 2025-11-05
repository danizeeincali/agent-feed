/**
 * Unit Tests for Agent Content Generator
 * Tests introduction post content generation
 * SPARC TDD: Write tests first, then implement
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AgentContentGenerator } from '../../../services/agents/agent-content-generator.js';

describe('AgentContentGenerator - Introduction Content Generation', () => {
  let generator;

  beforeEach(() => {
    generator = new AgentContentGenerator();
  });

  it('should generate introduction post content from agent config', () => {
    const agentConfig = {
      agentId: 'personal-todos-agent',
      displayName: 'Personal Todos',
      description: 'I help you manage tasks',
      capabilities: ['Create todos', 'Track priorities'],
      examples: ['Create a todo', 'Show high-impact tasks'],
      cta: 'Try creating a task!'
    };

    const content = generator.generateIntroContent(agentConfig);

    expect(content).toContain('Personal Todos');
    expect(content).toContain('I help you manage tasks');
    expect(content).toContain('Create todos');
    expect(content).toContain('Try creating a task!');
  });

  it('should format capabilities as a bulleted list', () => {
    const agentConfig = {
      agentId: 'test-agent',
      displayName: 'Test Agent',
      description: 'Test description',
      capabilities: ['Capability 1', 'Capability 2', 'Capability 3'],
      examples: ['Example 1'],
      cta: 'Try me!'
    };

    const content = generator.generateIntroContent(agentConfig);

    expect(content).toMatch(/- Capability 1/);
    expect(content).toMatch(/- Capability 2/);
    expect(content).toMatch(/- Capability 3/);
  });

  it('should include examples section in generated content', () => {
    const agentConfig = {
      agentId: 'test-agent',
      displayName: 'Test Agent',
      description: 'Test description',
      capabilities: ['Cap 1'],
      examples: ['Example 1', 'Example 2'],
      cta: 'Try me!'
    };

    const content = generator.generateIntroContent(agentConfig);

    expect(content).toMatch(/Example/i);
    expect(content).toContain('Example 1');
    expect(content).toContain('Example 2');
  });

  it('should generate post title in the format "Hi! I\'m [AgentName]"', () => {
    const agentConfig = {
      agentId: 'personal-todos-agent',
      displayName: 'Personal Todos',
      description: 'Task manager',
      capabilities: ['Tasks'],
      examples: ['Create task'],
      cta: 'Try it!'
    };

    const postData = generator.generateIntroPost(agentConfig, 'user-123');

    expect(postData.title).toContain("I'm Personal Todos");
  });

  it('should include agent metadata in generated post', () => {
    const agentConfig = {
      agentId: 'link-logger-agent',
      displayName: 'Link Logger',
      description: 'Save links',
      capabilities: ['Save URLs'],
      examples: ['Save this link'],
      cta: 'Share a URL!'
    };

    const postData = generator.generateIntroPost(agentConfig, 'user-123');

    expect(postData.agentId).toBe('link-logger-agent');
    expect(postData.authorId).toBe('user-123');
    expect(postData.isAgentResponse).toBe(true);
    expect(postData.metadata).toBeDefined();
    expect(postData.metadata.isIntroduction).toBe(true);
  });
});
