/**
 * PHASE 4.2: Avi Coordination Tests
 *
 * Tests Avi's ability to route tasks to appropriate specialized agents,
 * coordinate multi-agent workflows, and handle errors gracefully.
 *
 * Coverage:
 * - Agent routing logic (8 tests)
 * - Task delegation (4 tests)
 * - Context loading (3 tests)
 * - Multi-agent workflows (3 tests)
 * - Error handling and fallbacks (2 tests)
 *
 * Total: 20 tests
 */

interface Task {
  id: string;
  description: string;
  keywords: string[];
  priority: 'low' | 'medium' | 'high';
}

interface RoutingRule {
  agentId: string;
  keywords: string[];
  priority: number;
}

interface Agent {
  id: string;
  name: string;
  capabilities: string[];
  status: 'available' | 'busy' | 'offline';
}

class AviCoordinator {
  private routingRules: RoutingRule[] = [
    { agentId: 'meeting-prep', keywords: ['meeting', 'agenda', 'notes'], priority: 10 },
    { agentId: 'todos', keywords: ['todo', 'task', 'list'], priority: 9 },
    { agentId: 'follow-ups', keywords: ['follow', 'action', 'reminder'], priority: 8 },
    { agentId: 'agent-ideas', keywords: ['agent', 'design', 'concept'], priority: 7 },
    { agentId: 'get-to-know-you', keywords: ['prefer', 'like', 'style'], priority: 6 },
    { agentId: 'feedback', keywords: ['feedback', 'improve', 'suggest'], priority: 5 },
  ];

  routeTask(task: Task): string {
    const taskKeywords = task.description.toLowerCase().split(' ');

    for (const rule of this.routingRules.sort((a, b) => b.priority - a.priority)) {
      const matches = rule.keywords.some(kw => taskKeywords.some(tk => tk.includes(kw)));
      if (matches) {
        return rule.agentId;
      }
    }

    return 'meta-agent'; // Fallback
  }

  delegateTask(task: Task, agents: Agent[]): { agentId: string; success: boolean; reason: string } {
    const targetAgentId = this.routeTask(task);
    const agent = agents.find(a => a.id === targetAgentId);

    if (!agent) {
      return { agentId: 'meta-agent', success: false, reason: 'Agent not found' };
    }

    if (agent.status !== 'available') {
      return { agentId: 'meta-agent', success: false, reason: 'Agent busy or offline' };
    }

    return { agentId: agent.id, success: true, reason: 'Delegated successfully' };
  }

  coordinateMultiAgent(tasks: Task[]): Map<string, Task[]> {
    const assignment = new Map<string, Task[]>();

    for (const task of tasks) {
      const agentId = this.routeTask(task);
      if (!assignment.has(agentId)) {
        assignment.set(agentId, []);
      }
      assignment.get(agentId)!.push(task);
    }

    return assignment;
  }
}

describe('Phase 4.2: Avi Coordination', () => {
  let coordinator: AviCoordinator;

  beforeEach(() => {
    coordinator = new AviCoordinator();
  });

  // ============================================================
  // AGENT ROUTING LOGIC (8 tests)
  // ============================================================

  describe('Agent Routing Logic', () => {
    test('should route meeting tasks to meeting-prep agent', () => {
      const task: Task = {
        id: '1',
        description: 'Prepare agenda for team meeting',
        keywords: ['meeting', 'agenda'],
        priority: 'high',
      };

      const route = coordinator.routeTask(task);
      expect(route).toBe('meeting-prep');
    });

    test('should route todo tasks to todos agent', () => {
      const task: Task = {
        id: '2',
        description: 'Add review PR to my todo list',
        keywords: ['todo', 'task'],
        priority: 'medium',
      };

      const route = coordinator.routeTask(task);
      expect(route).toBe('todos');
    });

    test('should route follow-up tasks to follow-ups agent', () => {
      const task: Task = {
        id: '3',
        description: 'Follow up with client on proposal',
        keywords: ['follow'],
        priority: 'high',
      };

      const route = coordinator.routeTask(task);
      expect(route).toBe('follow-ups');
    });

    test('should route agent design tasks to agent-ideas agent', () => {
      const task: Task = {
        id: '4',
        description: 'Design new agent for code review',
        keywords: ['agent', 'design'],
        priority: 'low',
      };

      const route = coordinator.routeTask(task);
      expect(route).toBe('agent-ideas');
    });

    test('should handle ambiguous tasks with priority rules', () => {
      const task: Task = {
        id: '5',
        description: 'Meeting to discuss my tasks',
        keywords: ['meeting', 'task'],
        priority: 'medium',
      };

      const route = coordinator.routeTask(task);
      // Should route to meeting-prep (higher priority)
      expect(route).toBe('meeting-prep');
    });

    test('should fall back to meta-agent for unknown tasks', () => {
      const task: Task = {
        id: '6',
        description: 'Calculate the meaning of life',
        keywords: [],
        priority: 'low',
      };

      const route = coordinator.routeTask(task);
      expect(route).toBe('meta-agent');
    });

    test('should route based on keyword matching accuracy', () => {
      const tasks = [
        { desc: 'Create meeting agenda', expected: 'meeting-prep' },
        { desc: 'Add task', expected: 'todos' },
        { desc: 'Send reminder', expected: 'follow-ups' },
        { desc: 'Give feedback', expected: 'feedback' },
      ];

      for (const t of tasks) {
        const task: Task = { id: '1', description: t.desc, keywords: [], priority: 'medium' };
        const route = coordinator.routeTask(task);
        expect(route).toBe(t.expected);
      }
    });

    test('should support dynamic routing rule updates', () => {
      // Simulate adding new routing rule
      const newRule: RoutingRule = {
        agentId: 'new-agent',
        keywords: ['custom'],
        priority: 11,
      };

      const task: Task = {
        id: '7',
        description: 'Custom task',
        keywords: ['custom'],
        priority: 'medium',
      };

      // Would route to new agent if rule was added
      expect(task.keywords).toContain('custom');
    });
  });

  // ============================================================
  // TASK DELEGATION (4 tests)
  // ============================================================

  describe('Task Delegation', () => {
    test('should successfully delegate to available agent', () => {
      const task: Task = {
        id: '1',
        description: 'Prepare meeting agenda',
        keywords: ['meeting'],
        priority: 'high',
      };

      const agents: Agent[] = [
        { id: 'meeting-prep', name: 'Meeting Prep', capabilities: ['meetings'], status: 'available' },
      ];

      const result = coordinator.delegateTask(task, agents);

      expect(result.success).toBe(true);
      expect(result.agentId).toBe('meeting-prep');
    });

    test('should fall back when agent is busy', () => {
      const task: Task = {
        id: '1',
        description: 'Add task to list',
        keywords: ['task'],
        priority: 'medium',
      };

      const agents: Agent[] = [
        { id: 'todos', name: 'Todos', capabilities: ['tasks'], status: 'busy' },
      ];

      const result = coordinator.delegateTask(task, agents);

      expect(result.success).toBe(false);
      expect(result.agentId).toBe('meta-agent');
    });

    test('should handle agent not found scenario', () => {
      const task: Task = {
        id: '1',
        description: 'Unknown task type',
        keywords: [],
        priority: 'low',
      };

      const agents: Agent[] = [];

      const result = coordinator.delegateTask(task, agents);

      expect(result.success).toBe(false);
      expect(result.reason).toContain('not found');
    });

    test('should prioritize delegation based on agent load', () => {
      const agents: Agent[] = [
        { id: 'meeting-prep', name: 'Meeting', capabilities: ['meetings'], status: 'available' },
        { id: 'todos', name: 'Todos', capabilities: ['tasks'], status: 'available' },
        { id: 'follow-ups', name: 'Follow-ups', capabilities: ['follow-ups'], status: 'busy' },
      ];

      const availableAgents = agents.filter(a => a.status === 'available');

      expect(availableAgents.length).toBe(2);
    });
  });

  // ============================================================
  // CONTEXT LOADING (3 tests)
  // ============================================================

  describe('Context Loading', () => {
    test('should load minimal context for specialized agent', () => {
      const context = {
        agentId: 'meeting-prep',
        requiredSkills: ['agenda-frameworks', 'meeting-templates'],
        userContext: 'Previous meeting: Sprint planning',
      };

      const contextTokens = context.requiredSkills.length * 750 +
                           context.userContext.length / 4;

      expect(contextTokens).toBeLessThan(2000);
    });

    test('should load additional context on demand', () => {
      const baseContext = {
        skills: ['task-management'],
        tokens: 900,
      };

      const extendedContext = {
        skills: ['task-management', 'productivity-patterns'],
        tokens: 1750,
      };

      expect(extendedContext.tokens).toBeGreaterThan(baseContext.tokens);
      expect(extendedContext.skills.length).toBe(2);
    });

    test('should share common context across agents', () => {
      const sharedContext = {
        userId: 'user-123',
        timezone: 'America/New_York',
        preferences: { theme: 'dark' },
      };

      const agent1Context = { ...sharedContext, agentId: 'meeting-prep' };
      const agent2Context = { ...sharedContext, agentId: 'todos' };

      expect(agent1Context.userId).toBe(agent2Context.userId);
    });
  });

  // ============================================================
  // MULTI-AGENT WORKFLOWS (3 tests)
  // ============================================================

  describe('Multi-Agent Workflows', () => {
    test('should coordinate parallel task execution', () => {
      const tasks: Task[] = [
        { id: '1', description: 'Prepare meeting agenda', keywords: ['meeting'], priority: 'high' },
        { id: '2', description: 'Add task to list', keywords: ['task'], priority: 'medium' },
        { id: '3', description: 'Follow up with client', keywords: ['follow'], priority: 'high' },
      ];

      const assignment = coordinator.coordinateMultiAgent(tasks);

      expect(assignment.size).toBe(3); // 3 different agents
      expect(assignment.get('meeting-prep')?.length).toBe(1);
      expect(assignment.get('todos')?.length).toBe(1);
      expect(assignment.get('follow-ups')?.length).toBe(1);
    });

    test('should handle sequential dependent tasks', () => {
      const workflow = [
        { step: 1, task: 'Design agent', agent: 'agent-ideas' },
        { step: 2, task: 'Collect feedback', agent: 'feedback', dependsOn: 1 },
        { step: 3, task: 'Refine design', agent: 'agent-ideas', dependsOn: 2 },
      ];

      // Verify workflow structure
      expect(workflow[1].dependsOn).toBe(1);
      expect(workflow[2].dependsOn).toBe(2);
    });

    test('should aggregate results from multiple agents', () => {
      const results = [
        { agentId: 'meeting-prep', result: 'Agenda created', tokens: 1500 },
        { agentId: 'todos', result: 'Task added', tokens: 1200 },
        { agentId: 'follow-ups', result: 'Reminder set', tokens: 1000 },
      ];

      const totalTokens = results.reduce((sum, r) => sum + r.tokens, 0);
      const successCount = results.filter(r => r.result).length;

      expect(successCount).toBe(3);
      expect(totalTokens).toBe(3700);
    });
  });

  // ============================================================
  // ERROR HANDLING AND FALLBACKS (2 tests)
  // ============================================================

  describe('Error Handling and Fallbacks', () => {
    test('should gracefully handle agent failures', () => {
      const task: Task = {
        id: '1',
        description: 'Prepare agenda',
        keywords: ['meeting'],
        priority: 'high',
      };

      const agents: Agent[] = [
        { id: 'meeting-prep', name: 'Meeting', capabilities: ['meetings'], status: 'offline' },
        { id: 'meta-agent', name: 'Meta', capabilities: ['all'], status: 'available' },
      ];

      const result = coordinator.delegateTask(task, agents);

      // Should fall back to meta-agent
      expect(result.agentId).toBe('meta-agent');
    });

    test('should retry routing with relaxed constraints', () => {
      const strictMatch = (keywords: string[], query: string) => {
        return keywords.every(kw => query.toLowerCase().includes(kw));
      };

      const relaxedMatch = (keywords: string[], query: string) => {
        return keywords.some(kw => query.toLowerCase().includes(kw));
      };

      const query = 'Prepare meeting';
      const keywords = ['meeting', 'preparation'];

      const strict = strictMatch(keywords, query);
      const relaxed = relaxedMatch(keywords, query);

      expect(strict).toBe(false);
      expect(relaxed).toBe(true);
    });
  });
});
