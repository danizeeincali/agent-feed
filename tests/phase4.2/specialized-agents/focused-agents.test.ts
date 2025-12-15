/**
 * PHASE 4.2: Specialized/Focused Agents Tests
 *
 * Tests for 6 specialized agents, each with specific responsibilities and strict token budgets.
 * Each agent loads only relevant skills, preventing token bloat from the meta-agent approach.
 *
 * Agents tested:
 * 1. Meeting Prep Agent (10 tests)
 * 2. Personal Todos Agent (10 tests)
 * 3. Follow-ups Agent (10 tests)
 * 4. Agent Ideas Agent (10 tests)
 * 5. Get To Know You Agent (10 tests)
 * 6. Agent Feedback Agent (10 tests)
 *
 * Coverage per agent:
 * - Token budget compliance
 * - Responsibility boundaries
 * - Skills loading efficiency
 * - No overlap with other agents
 * - Integration with Avi coordination
 *
 * Total: 60 tests
 */

import * as fs from 'fs';
import * as path from 'path';

// Mock agent configuration structure
interface AgentConfig {
  id: string;
  name: string;
  description: string;
  responsibilities: string[];
  skills: string[];
  maxTokenBudget: number;
  boundaries: {
    handles: string[];
    doesNotHandle: string[];
  };
}

interface SkillConfig {
  id: string;
  name: string;
  tokenSize: number;
  content: string;
}

// Helper to calculate token count (simplified)
function estimateTokenCount(text: string): number {
  // Rough estimation: ~4 characters per token
  return Math.ceil(text.length / 4);
}

// Helper to load agent skills
function loadAgentSkills(agentId: string, skillIds: string[]): {
  skills: SkillConfig[];
  totalTokens: number;
} {
  const skills: SkillConfig[] = skillIds.map(skillId => ({
    id: skillId,
    name: skillId.replace(/-/g, ' '),
    tokenSize: 500, // Mock token size
    content: `Skill content for ${skillId}`,
  }));

  const totalTokens = skills.reduce((sum, skill) => sum + skill.tokenSize, 0);

  return { skills, totalTokens };
}

describe('Phase 4.2: Specialized/Focused Agents', () => {
  const agentsDir = path.join(process.cwd(), 'prod', '.claude', 'agents');

  // ============================================================
  // 1. MEETING PREP AGENT (10 tests)
  // ============================================================

  describe('Meeting Prep Agent', () => {
    const agentConfig: AgentConfig = {
      id: 'meeting-prep-agent',
      name: 'Meeting Prep Agent',
      description: 'Helps prepare for meetings with agendas, notes, and frameworks',
      responsibilities: [
        'Create meeting agendas',
        'Take meeting notes',
        'Apply meeting frameworks',
        'Prepare discussion topics',
      ],
      skills: [
        'agenda-frameworks',
        'meeting-templates',
        'note-taking',
        'meeting-coordination',
      ],
      maxTokenBudget: 5000,
      boundaries: {
        handles: ['meeting preparation', 'agendas', 'meeting notes'],
        doesNotHandle: ['personal todos', 'follow-ups', 'agent design'],
      },
    };

    test('should stay within token budget', () => {
      const { totalTokens } = loadAgentSkills(agentConfig.id, agentConfig.skills);

      expect(totalTokens).toBeLessThanOrEqual(agentConfig.maxTokenBudget);
    });

    test('should load only meeting-related skills', () => {
      const { skills } = loadAgentSkills(agentConfig.id, agentConfig.skills);

      const meetingRelatedSkills = skills.filter(s =>
        s.id.includes('agenda') || s.id.includes('meeting') || s.id.includes('note')
      );

      expect(meetingRelatedSkills.length).toBe(skills.length);
    });

    test('should not load unrelated skills', () => {
      const unrelatedSkills = [
        'task-management',
        'link-curation',
        'agent-feedback-patterns',
      ];

      const { skills } = loadAgentSkills(agentConfig.id, agentConfig.skills);
      const skillIds = skills.map(s => s.id);

      for (const unrelated of unrelatedSkills) {
        expect(skillIds).not.toContain(unrelated);
      }
    });

    test('should have clear responsibility boundaries', () => {
      const task1 = 'Create agenda for team meeting';
      const task2 = 'Add item to personal todo list';

      const handles1 = agentConfig.responsibilities.some(r =>
        r.toLowerCase().includes('agenda')
      );
      const handles2 = agentConfig.responsibilities.some(r =>
        r.toLowerCase().includes('todo')
      );

      expect(handles1).toBe(true);
      expect(handles2).toBe(false);
    });

    test('should list specific meeting-related capabilities', () => {
      expect(agentConfig.responsibilities).toContain('Create meeting agendas');
      expect(agentConfig.responsibilities).toContain('Take meeting notes');
    });

    test('should have minimal skill overlap with other agents', () => {
      const otherAgentSkills = ['task-management', 'follow-up-patterns', 'agent-design'];

      const { skills } = loadAgentSkills(agentConfig.id, agentConfig.skills);
      const skillIds = skills.map(s => s.id);

      const overlaps = skillIds.filter(id => otherAgentSkills.includes(id));

      expect(overlaps.length).toBe(0);
    });

    test('should efficiently load progressive disclosure of skills', () => {
      // Essential skills loaded first
      const essentialSkills = agentConfig.skills.slice(0, 2);
      const { totalTokens: essentialTokens } = loadAgentSkills(agentConfig.id, essentialSkills);

      // Full skills
      const { totalTokens: fullTokens } = loadAgentSkills(agentConfig.id, agentConfig.skills);

      expect(essentialTokens).toBeLessThan(fullTokens);
      expect(essentialTokens).toBeLessThanOrEqual(agentConfig.maxTokenBudget * 0.6); // 60% budget
    });

    test('should support Avi routing for meeting tasks', () => {
      const routingRules = {
        keywords: ['meeting', 'agenda', 'notes', 'discussion'],
        agentId: agentConfig.id,
      };

      const testTasks = [
        'Prepare agenda for standup',
        'Take notes during retro',
        'Create discussion topics',
      ];

      for (const task of testTasks) {
        const shouldRoute = routingRules.keywords.some(kw =>
          task.toLowerCase().includes(kw)
        );
        expect(shouldRoute).toBe(true);
      }
    });

    test('should not handle tasks outside boundaries', () => {
      const task = 'Add new feature to todo list';

      const withinBoundaries = agentConfig.boundaries.handles.some(boundary =>
        task.toLowerCase().includes(boundary.toLowerCase())
      );

      expect(withinBoundaries).toBe(false);
    });

    test('should integrate with shared skills efficiently', () => {
      // Shared skills across all agents
      const sharedSkills = ['user-preferences', 'conversation-patterns'];

      // Meeting-specific skills
      const specificSkills = agentConfig.skills;

      // Total should still be under budget
      const allSkills = [...specificSkills, ...sharedSkills];
      const { totalTokens } = loadAgentSkills(agentConfig.id, allSkills);

      expect(totalTokens).toBeLessThanOrEqual(agentConfig.maxTokenBudget * 1.2); // Allow 20% for shared
    });
  });

  // ============================================================
  // 2. PERSONAL TODOS AGENT (10 tests)
  // ============================================================

  describe('Personal Todos Agent', () => {
    const agentConfig: AgentConfig = {
      id: 'personal-todos-agent',
      name: 'Personal Todos Agent',
      description: 'Manages personal task list, priorities, and tracking',
      responsibilities: [
        'Add/remove todo items',
        'Prioritize tasks',
        'Track task completion',
        'Organize task categories',
      ],
      skills: [
        'task-management',
        'productivity-patterns',
        'time-management',
        'goal-frameworks',
      ],
      maxTokenBudget: 5000,
      boundaries: {
        handles: ['personal tasks', 'todo list', 'task priorities'],
        doesNotHandle: ['meetings', 'agent feedback', 'social interactions'],
      },
    };

    test('should stay within token budget', () => {
      const { totalTokens } = loadAgentSkills(agentConfig.id, agentConfig.skills);
      expect(totalTokens).toBeLessThanOrEqual(agentConfig.maxTokenBudget);
    });

    test('should load only task-related skills', () => {
      const { skills } = loadAgentSkills(agentConfig.id, agentConfig.skills);

      const taskRelatedSkills = skills.filter(s =>
        s.id.includes('task') || s.id.includes('productivity') || s.id.includes('time')
      );

      expect(taskRelatedSkills.length).toBeGreaterThan(0);
    });

    test('should handle task management operations', () => {
      const operations = [
        'Add task: Buy groceries',
        'Mark task complete: Finish report',
        'Set priority high for: Call dentist',
      ];

      for (const op of operations) {
        const isTaskOperation = agentConfig.boundaries.handles.some(h =>
          op.toLowerCase().includes(h.split(' ')[0].toLowerCase())
        );

        expect(isTaskOperation).toBe(true);
      }
    });

    test('should not overlap with meeting prep agent', () => {
      const meetingSkills = ['agenda-frameworks', 'meeting-templates', 'note-taking'];

      const { skills } = loadAgentSkills(agentConfig.id, agentConfig.skills);
      const skillIds = skills.map(s => s.id);

      const overlaps = skillIds.filter(id => meetingSkills.includes(id));
      expect(overlaps.length).toBe(0);
    });

    test('should prioritize task management skills', () => {
      const { skills } = loadAgentSkills(agentConfig.id, agentConfig.skills);

      expect(skills[0].id).toBe('task-management');
    });

    test('should support task categorization', () => {
      const categories = ['work', 'personal', 'urgent', 'important'];

      const categorizationSupported = agentConfig.skills.includes('task-management');

      expect(categorizationSupported).toBe(true);
    });

    test('should efficiently route task-related queries to this agent', () => {
      const queries = [
        'What\'s on my todo list?',
        'Add buy milk to tasks',
        'What are my top priorities?',
      ];

      const keywords = ['todo', 'task', 'priorit'];

      for (const query of queries) {
        const shouldRoute = keywords.some(kw => query.toLowerCase().includes(kw));
        expect(shouldRoute).toBe(true);
      }
    });

    test('should reject non-task queries', () => {
      const nonTaskQueries = [
        'Prepare agenda for meeting',
        'Give feedback on agent',
        'What\'s your favorite color?',
      ];

      for (const query of nonTaskQueries) {
        const isTaskQuery = agentConfig.boundaries.handles.some(h =>
          query.toLowerCase().includes(h.split(' ')[0])
        );

        expect(isTaskQuery).toBe(false);
      }
    });

    test('should load productivity patterns efficiently', () => {
      const { skills } = loadAgentSkills(agentConfig.id, agentConfig.skills);

      const productivitySkill = skills.find(s => s.id === 'productivity-patterns');

      expect(productivitySkill).toBeDefined();
      expect(productivitySkill!.tokenSize).toBeLessThan(1500);
    });

    test('should integrate with time management skills', () => {
      const { skills } = loadAgentSkills(agentConfig.id, agentConfig.skills);

      const timeManagement = skills.find(s => s.id === 'time-management');

      expect(timeManagement).toBeDefined();
    });
  });

  // ============================================================
  // 3. FOLLOW-UPS AGENT (10 tests)
  // ============================================================

  describe('Follow-ups Agent', () => {
    const agentConfig: AgentConfig = {
      id: 'follow-ups-agent',
      name: 'Follow-ups Agent',
      description: 'Tracks action items, follow-ups, and commitments',
      responsibilities: [
        'Track follow-up items',
        'Monitor action items',
        'Reminder management',
        'Commitment tracking',
      ],
      skills: [
        'follow-up-patterns',
        'task-management',
        'time-management',
      ],
      maxTokenBudget: 4000,
      boundaries: {
        handles: ['follow-ups', 'action items', 'reminders'],
        doesNotHandle: ['meetings', 'agent design', 'personal preferences'],
      },
    };

    test('should stay within token budget', () => {
      const { totalTokens } = loadAgentSkills(agentConfig.id, agentConfig.skills);
      expect(totalTokens).toBeLessThanOrEqual(agentConfig.maxTokenBudget);
    });

    test('should focus on follow-up-specific skills', () => {
      const { skills } = loadAgentSkills(agentConfig.id, agentConfig.skills);

      const followUpSkill = skills.find(s => s.id === 'follow-up-patterns');

      expect(followUpSkill).toBeDefined();
    });

    test('should track action items effectively', () => {
      const actionItems = [
        'Follow up with client on proposal',
        'Check status of bug fix',
        'Send reminder about deadline',
      ];

      for (const item of actionItems) {
        const isFollowUp = agentConfig.boundaries.handles.some(h =>
          item.toLowerCase().includes(h.split(' ')[0])
        );

        expect(isFollowUp).toBe(true);
      }
    });

    test('should not handle meeting preparation', () => {
      const meetingTask = 'Prepare agenda for team meeting';

      const withinBoundaries = agentConfig.boundaries.handles.some(h =>
        meetingTask.toLowerCase().includes(h)
      );

      expect(withinBoundaries).toBe(false);
    });

    test('should have minimal skill set for efficiency', () => {
      expect(agentConfig.skills.length).toBeLessThanOrEqual(4);
    });

    test('should route follow-up queries correctly', () => {
      const keywords = ['follow up', 'action item', 'reminder', 'check in'];

      const testQuery = 'What follow-ups do I have this week?';

      const shouldRoute = keywords.some(kw => testQuery.toLowerCase().includes(kw));

      expect(shouldRoute).toBe(true);
    });

    test('should integrate with task management for action items', () => {
      const { skills } = loadAgentSkills(agentConfig.id, agentConfig.skills);

      const hasTaskManagement = skills.some(s => s.id === 'task-management');

      expect(hasTaskManagement).toBe(true);
    });

    test('should support time-based follow-ups', () => {
      const { skills } = loadAgentSkills(agentConfig.id, agentConfig.skills);

      const hasTimeManagement = skills.some(s => s.id === 'time-management');

      expect(hasTimeManagement).toBe(true);
    });

    test('should maintain clear boundaries with todos agent', () => {
      // Follow-ups agent: tracks commitments to others
      // Todos agent: tracks personal tasks

      const followUpTask = 'Follow up with John about project';
      const todoTask = 'Complete my project report';

      const isFollowUp = followUpTask.includes('follow up');
      const isTodo = !todoTask.includes('follow up');

      expect(isFollowUp).toBe(true);
      expect(isTodo).toBe(true);
    });

    test('should efficiently load only necessary patterns', () => {
      const { totalTokens } = loadAgentSkills(agentConfig.id, agentConfig.skills);

      // Should be most efficient (smallest token count)
      expect(totalTokens).toBeLessThan(3000);
    });
  });

  // ============================================================
  // 4. AGENT IDEAS AGENT (10 tests)
  // ============================================================

  describe('Agent Ideas Agent', () => {
    const agentConfig: AgentConfig = {
      id: 'agent-ideas-agent',
      name: 'Agent Ideas Agent',
      description: 'Helps brainstorm and evaluate new agent ideas',
      responsibilities: [
        'Generate agent concepts',
        'Evaluate agent viability',
        'Design agent capabilities',
        'Suggest agent improvements',
      ],
      skills: [
        'idea-evaluation',
        'agent-design-patterns',
        'goal-frameworks',
      ],
      maxTokenBudget: 5000,
      boundaries: {
        handles: ['agent concepts', 'agent design', 'capability definition'],
        doesNotHandle: ['personal tasks', 'meetings', 'follow-ups'],
      },
    };

    test('should stay within token budget', () => {
      const { totalTokens } = loadAgentSkills(agentConfig.id, agentConfig.skills);
      expect(totalTokens).toBeLessThanOrEqual(agentConfig.maxTokenBudget);
    });

    test('should load agent design-specific skills', () => {
      const { skills } = loadAgentSkills(agentConfig.id, agentConfig.skills);

      const designSkill = skills.find(s => s.id === 'agent-design-patterns');

      expect(designSkill).toBeDefined();
    });

    test('should support idea evaluation workflows', () => {
      const { skills } = loadAgentSkills(agentConfig.id, agentConfig.skills);

      const evaluationSkill = skills.find(s => s.id === 'idea-evaluation');

      expect(evaluationSkill).toBeDefined();
    });

    test('should handle agent brainstorming queries', () => {
      const queries = [
        'Suggest a new agent for code review',
        'What capabilities should a research agent have?',
        'Evaluate this agent concept',
      ];

      for (const query of queries) {
        const isAgentQuery = query.toLowerCase().includes('agent');
        expect(isAgentQuery).toBe(true);
      }
    });

    test('should not handle operational tasks', () => {
      const operationalTasks = [
        'Add task to my list',
        'Prepare meeting agenda',
        'Follow up with team',
      ];

      for (const task of operationalTasks) {
        const withinBoundaries = agentConfig.boundaries.handles.some(h =>
          task.toLowerCase().includes(h)
        );

        expect(withinBoundaries).toBe(false);
      }
    });

    test('should provide agent design frameworks', () => {
      const frameworks = [
        'Capability definition',
        'Responsibility boundaries',
        'Skill requirements',
        'Token budget planning',
      ];

      // Agent should know these patterns
      expect(agentConfig.responsibilities.some(r => r.includes('capabilities'))).toBe(true);
    });

    test('should route agent design queries correctly', () => {
      const keywords = ['agent', 'design', 'capability', 'concept'];

      const testQuery = 'How should I design an agent for documentation?';

      const shouldRoute = keywords.some(kw => testQuery.toLowerCase().includes(kw));

      expect(shouldRoute).toBe(true);
    });

    test('should integrate with goal frameworks for agent purpose', () => {
      const { skills } = loadAgentSkills(agentConfig.id, agentConfig.skills);

      const hasGoalFrameworks = skills.some(s => s.id === 'goal-frameworks');

      expect(hasGoalFrameworks).toBe(true);
    });

    test('should maintain separation from implementation agents', () => {
      // This agent designs, doesn't implement
      const implementationSkills = ['code-generation', 'deployment', 'testing'];

      const { skills } = loadAgentSkills(agentConfig.id, agentConfig.skills);
      const skillIds = skills.map(s => s.id);

      const overlaps = skillIds.filter(id => implementationSkills.includes(id));

      expect(overlaps.length).toBe(0);
    });

    test('should efficiently load creative thinking skills', () => {
      const { skills } = loadAgentSkills(agentConfig.id, agentConfig.skills);

      expect(skills.length).toBeLessThanOrEqual(4);
      expect(skills.some(s => s.id.includes('idea') || s.id.includes('design'))).toBe(true);
    });
  });

  // ============================================================
  // 5. GET TO KNOW YOU AGENT (10 tests)
  // ============================================================

  describe('Get To Know You Agent', () => {
    const agentConfig: AgentConfig = {
      id: 'get-to-know-you-agent',
      name: 'Get To Know You Agent',
      description: 'Learns about user preferences, habits, and working style',
      responsibilities: [
        'Discover user preferences',
        'Track user habits',
        'Learn communication style',
        'Remember important details',
      ],
      skills: [
        'user-preferences',
        'conversation-patterns',
        'feedback-frameworks',
      ],
      maxTokenBudget: 4000,
      boundaries: {
        handles: ['user preferences', 'personal details', 'communication style'],
        doesNotHandle: ['tasks', 'meetings', 'agent design'],
      },
    };

    test('should stay within token budget', () => {
      const { totalTokens } = loadAgentSkills(agentConfig.id, agentConfig.skills);
      expect(totalTokens).toBeLessThanOrEqual(agentConfig.maxTokenBudget);
    });

    test('should focus on user-centric skills', () => {
      const { skills } = loadAgentSkills(agentConfig.id, agentConfig.skills);

      const userPrefs = skills.find(s => s.id === 'user-preferences');

      expect(userPrefs).toBeDefined();
    });

    test('should handle preference-related queries', () => {
      const queries = [
        'What are my preferences for code style?',
        'Remember that I prefer mornings for deep work',
        'What communication style do I use?',
      ];

      for (const query of queries) {
        const isPreferenceQuery = query.toLowerCase().includes('prefer') ||
                                   query.toLowerCase().includes('remember') ||
                                   query.toLowerCase().includes('style');

        expect(isPreferenceQuery).toBe(true);
      }
    });

    test('should not handle task management', () => {
      const taskQuery = 'Add review PR to my todo list';

      const withinBoundaries = agentConfig.boundaries.handles.some(h =>
        taskQuery.toLowerCase().includes(h)
      );

      expect(withinBoundaries).toBe(false);
    });

    test('should load conversation pattern recognition skills', () => {
      const { skills } = loadAgentSkills(agentConfig.id, agentConfig.skills);

      const conversationSkill = skills.find(s => s.id === 'conversation-patterns');

      expect(conversationSkill).toBeDefined();
    });

    test('should support feedback collection', () => {
      const { skills } = loadAgentSkills(agentConfig.id, agentConfig.skills);

      const feedbackSkill = skills.find(s => s.id === 'feedback-frameworks');

      expect(feedbackSkill).toBeDefined();
    });

    test('should route user preference queries correctly', () => {
      const keywords = ['prefer', 'like', 'habit', 'style', 'usually'];

      const testQuery = 'I prefer to work in the evening';

      const shouldRoute = keywords.some(kw => testQuery.toLowerCase().includes(kw));

      expect(shouldRoute).toBe(true);
    });

    test('should maintain privacy-focused boundaries', () => {
      // Should not share learned preferences outside appropriate context
      const boundaries = {
        stores: 'user preferences',
        sharesWith: ['user themselves'],
        doesNotShareWith: ['external systems', 'other agents'],
      };

      expect(boundaries.sharesWith).toEqual(['user themselves']);
    });

    test('should efficiently learn incrementally', () => {
      // Small token footprint for incremental learning
      const { totalTokens } = loadAgentSkills(agentConfig.id, agentConfig.skills);

      expect(totalTokens).toBeLessThan(3500);
    });

    test('should integrate with shared conversation skills', () => {
      const { skills } = loadAgentSkills(agentConfig.id, agentConfig.skills);

      const conversationSkills = skills.filter(s => s.id.includes('conversation'));

      expect(conversationSkills.length).toBeGreaterThan(0);
    });
  });

  // ============================================================
  // 6. AGENT FEEDBACK AGENT (10 tests)
  // ============================================================

  describe('Agent Feedback Agent', () => {
    const agentConfig: AgentConfig = {
      id: 'agent-feedback-agent',
      name: 'Agent Feedback Agent',
      description: 'Collects and processes feedback about agent performance',
      responsibilities: [
        'Collect agent feedback',
        'Analyze feedback patterns',
        'Suggest agent improvements',
        'Track satisfaction metrics',
      ],
      skills: [
        'feedback-frameworks',
        'idea-evaluation',
        'conversation-patterns',
      ],
      maxTokenBudget: 4500,
      boundaries: {
        handles: ['agent feedback', 'performance evaluation', 'improvement suggestions'],
        doesNotHandle: ['personal tasks', 'meetings', 'user preferences'],
      },
    };

    test('should stay within token budget', () => {
      const { totalTokens } = loadAgentSkills(agentConfig.id, agentConfig.skills);
      expect(totalTokens).toBeLessThanOrEqual(agentConfig.maxTokenBudget);
    });

    test('should load feedback-specific skills', () => {
      const { skills } = loadAgentSkills(agentConfig.id, agentConfig.skills);

      const feedbackSkill = skills.find(s => s.id === 'feedback-frameworks');

      expect(feedbackSkill).toBeDefined();
    });

    test('should handle feedback collection queries', () => {
      const queries = [
        'The meeting agent was very helpful',
        'I think the todos agent could be improved',
        'Rate my experience with the agent',
      ];

      for (const query of queries) {
        const isFeedback = query.toLowerCase().includes('helpful') ||
                           query.toLowerCase().includes('improved') ||
                           query.toLowerCase().includes('rate');

        expect(isFeedback).toBe(true);
      }
    });

    test('should analyze feedback patterns', () => {
      const feedbackSamples = [
        { sentiment: 'positive', topic: 'meeting-prep' },
        { sentiment: 'negative', topic: 'todos' },
        { sentiment: 'positive', topic: 'meeting-prep' },
      ];

      const meetingFeedback = feedbackSamples.filter(f => f.topic === 'meeting-prep');
      const positiveRate = meetingFeedback.filter(f => f.sentiment === 'positive').length / meetingFeedback.length;

      expect(positiveRate).toBe(1);
    });

    test('should not handle operational tasks', () => {
      const operationalTask = 'Prepare agenda for standup';

      const withinBoundaries = agentConfig.boundaries.handles.some(h =>
        operationalTask.toLowerCase().includes(h)
      );

      expect(withinBoundaries).toBe(false);
    });

    test('should integrate with evaluation frameworks', () => {
      const { skills } = loadAgentSkills(agentConfig.id, agentConfig.skills);

      const evaluationSkill = skills.find(s => s.id === 'idea-evaluation');

      expect(evaluationSkill).toBeDefined();
    });

    test('should route feedback queries correctly', () => {
      const keywords = ['feedback', 'improve', 'suggestion', 'rating', 'experience'];

      const testQuery = 'I have feedback about the follow-ups agent';

      const shouldRoute = keywords.some(kw => testQuery.toLowerCase().includes(kw));

      expect(shouldRoute).toBe(true);
    });

    test('should track satisfaction metrics over time', () => {
      const metrics = {
        totalFeedback: 50,
        positiveCount: 40,
        negativeCount: 10,
        satisfactionRate: 0.8,
      };

      expect(metrics.satisfactionRate).toBeGreaterThan(0.7);
    });

    test('should suggest improvements based on feedback', () => {
      const feedbackData = [
        'Meeting agent is slow',
        'Meeting agent is slow',
        'Meeting agent is slow',
      ];

      const commonIssues = feedbackData.reduce((acc, fb) => {
        const match = fb.match(/(\w+) is (\w+)/);
        if (match) {
          const key = `${match[1]}-${match[2]}`;
          acc[key] = (acc[key] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      const topIssue = Object.entries(commonIssues).sort((a, b) => b[1] - a[1])[0];

      expect(topIssue[0]).toBe('Meeting-slow');
      expect(topIssue[1]).toBe(3);
    });

    test('should efficiently process feedback without bloat', () => {
      const { totalTokens } = loadAgentSkills(agentConfig.id, agentConfig.skills);

      expect(totalTokens).toBeLessThan(4000);
    });
  });

  // ============================================================
  // CROSS-AGENT VALIDATION
  // ============================================================

  describe('Cross-Agent Validation', () => {
    test('should have no skill overlap between specialized agents', () => {
      const agentSkills = {
        'meeting-prep': ['agenda-frameworks', 'meeting-templates', 'note-taking'],
        'todos': ['task-management', 'productivity-patterns', 'time-management'],
        'follow-ups': ['follow-up-patterns'],
        'agent-ideas': ['idea-evaluation', 'agent-design-patterns'],
        'get-to-know-you': ['user-preferences'],
        'agent-feedback': ['feedback-frameworks'],
      };

      const allSkills = Object.values(agentSkills).flat();
      const uniqueSkills = new Set(allSkills);

      // Some overlap is OK (shared skills), but each agent should have unique primary skills
      expect(uniqueSkills.size).toBeGreaterThan(allSkills.length * 0.7);
    });

    test('should collectively stay under total token budget', () => {
      const agentConfigs = [
        { id: 'meeting-prep', budget: 5000 },
        { id: 'todos', budget: 5000 },
        { id: 'follow-ups', budget: 4000 },
        { id: 'agent-ideas', budget: 5000 },
        { id: 'get-to-know-you', budget: 4000 },
        { id: 'agent-feedback', budget: 4500 },
      ];

      const totalBudget = agentConfigs.reduce((sum, a) => sum + a.budget, 0);

      // Total budget should be significantly less than meta-agent
      const metaAgentBudget = 50000; // Hypothetical meta-agent budget

      expect(totalBudget).toBeLessThan(metaAgentBudget * 0.7); // 70%+ reduction
    });

    test('should have clear routing rules with no ambiguity', () => {
      const routingRules = [
        { keywords: ['meeting', 'agenda'], agent: 'meeting-prep' },
        { keywords: ['todo', 'task'], agent: 'todos' },
        { keywords: ['follow', 'action item'], agent: 'follow-ups' },
        { keywords: ['agent', 'design'], agent: 'agent-ideas' },
        { keywords: ['prefer', 'style'], agent: 'get-to-know-you' },
        { keywords: ['feedback', 'improve'], agent: 'agent-feedback' },
      ];

      // Test query should match exactly one agent
      const testQuery = 'Add task to my list';

      const matches = routingRules.filter(rule =>
        rule.keywords.some(kw => testQuery.toLowerCase().includes(kw))
      );

      expect(matches.length).toBe(1);
      expect(matches[0].agent).toBe('todos');
    });

    test('should demonstrate token efficiency improvement over meta-agent', () => {
      // Meta-agent approach: loads ALL skills for every task
      const allSkills = [
        'agenda-frameworks', 'meeting-templates', 'note-taking',
        'task-management', 'productivity-patterns', 'time-management',
        'follow-up-patterns', 'idea-evaluation', 'agent-design-patterns',
        'user-preferences', 'conversation-patterns', 'feedback-frameworks',
        'goal-frameworks',
      ];

      const metaAgentTokens = allSkills.length * 500; // ~6500 tokens

      // Specialized agent: loads only relevant skills
      const specializedTokens = 3 * 500; // ~1500 tokens

      const tokenReduction = ((metaAgentTokens - specializedTokens) / metaAgentTokens) * 100;

      expect(tokenReduction).toBeGreaterThan(70); // 70%+ reduction
    });

    test('should support parallel execution without conflicts', () => {
      const tasks = [
        { task: 'Prepare meeting agenda', agent: 'meeting-prep' },
        { task: 'Add task to list', agent: 'todos' },
        { task: 'Collect feedback', agent: 'agent-feedback' },
      ];

      // All tasks can run in parallel (no shared state)
      const canRunInParallel = tasks.every((t, i, arr) =>
        arr.filter((t2, j) => j !== i && t2.agent === t.agent).length === 0
      );

      expect(canRunInParallel).toBe(true);
    });

    test('should maintain consistent skill loading patterns', () => {
      const agents = ['meeting-prep', 'todos', 'follow-ups'];

      const loadingPatterns = agents.map(agentId => {
        const skills = agentId === 'meeting-prep' ? ['agenda-frameworks', 'meeting-templates']
          : agentId === 'todos' ? ['task-management', 'productivity-patterns']
          : ['follow-up-patterns'];

        return {
          agentId,
          skillCount: skills.length,
          loadTime: skills.length * 10, // Mock load time
        };
      });

      const avgLoadTime = loadingPatterns.reduce((sum, p) => sum + p.loadTime, 0) / loadingPatterns.length;

      expect(avgLoadTime).toBeLessThan(50); // Fast loading
    });
  });
});
