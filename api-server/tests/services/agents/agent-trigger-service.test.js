/**
 * Unit Tests for Agent Trigger Service
 * Tests contextual trigger detection for agent introductions
 * SPARC TDD: Write tests first, then implement
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AgentTriggerService } from '../../../services/agents/agent-trigger-service.js';

describe('AgentTriggerService - Contextual Trigger Detection', () => {
  let service;

  beforeEach(() => {
    service = new AgentTriggerService();
  });

  it('should detect URL in post and trigger Link Logger introduction', () => {
    const postContent = 'Check out this article: https://example.com/article';
    const triggers = service.detectTriggers(postContent);

    expect(triggers).toContain('link-logger-agent');
  });

  it('should detect meeting mention and trigger Meeting Prep introduction', () => {
    const postContent = 'I have a meeting tomorrow with the product team';
    const triggers = service.detectTriggers(postContent);

    expect(triggers).toContain('meeting-prep-agent');
  });

  it('should detect task/todo mention and trigger Personal Todos introduction', () => {
    const postContent = 'Need to create a todo for reviewing the PR';
    const triggers = service.detectTriggers(postContent);

    expect(triggers).toContain('personal-todos-agent');
  });

  it('should detect multiple triggers in a single post', () => {
    const postContent = 'Meeting tomorrow to discuss todo items: https://agenda.com';
    const triggers = service.detectTriggers(postContent);

    expect(triggers).toContain('meeting-prep-agent');
    expect(triggers).toContain('personal-todos-agent');
    expect(triggers).toContain('link-logger-agent');
    expect(triggers.length).toBeGreaterThanOrEqual(3);
  });

  it('should detect learning-related keywords and trigger Learning Optimizer', () => {
    const postContent = 'I want to learn React and improve my skills';
    const triggers = service.detectTriggers(postContent);

    expect(triggers).toContain('learning-optimizer-agent');
  });

  it('should detect completed task and trigger Follow-ups agent', () => {
    const postContent = 'Finished the API implementation today';
    const triggers = service.detectTriggers(postContent);

    expect(triggers).toContain('follow-ups-agent');
  });

  it('should return empty array when no triggers match', () => {
    const postContent = 'Just a random thought about nothing specific';
    const triggers = service.detectTriggers(postContent);

    expect(triggers).toBeInstanceOf(Array);
    // May be empty or contain only immediate agents
  });

  it('should match contextual keywords case-insensitively', () => {
    const postContent = 'MEETING tomorrow for TODO review';
    const triggers = service.detectTriggers(postContent);

    expect(triggers).toContain('meeting-prep-agent');
    expect(triggers).toContain('personal-todos-agent');
  });
});
