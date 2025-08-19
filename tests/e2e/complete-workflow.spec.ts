/**
 * End-to-End Complete Workflow Tests
 * Tests complete user workflows from authentication to agent coordination
 */

import { test, expect, Page, Browser, BrowserContext } from '@playwright/test';
import { claudeCodeOrchestrator } from '@/orchestration/claude-code-orchestrator';
import { swarmCoordinator } from '@/orchestration/swarm-coordinator';

interface WorkflowContext {
  page: Page;
  browser: Browser;
  context: BrowserContext;
  swarmId?: string;
  sessionId?: string;
  userId: string;
}

test.describe('Complete E2E Workflow Tests', () => {
  let workflowContext: WorkflowContext;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      recordVideo: { dir: 'test-results/videos/' },
      recordHar: { path: 'test-results/network.har' }
    });

    const page = await context.newPage();
    
    workflowContext = {
      page,
      browser,
      context,
      userId: 'e2e-test-user'
    };

    // Enable console logging for debugging
    page.on('console', msg => console.log(`Browser Console: ${msg.text()}`));
    page.on('pageerror', err => console.error(`Browser Error: ${err.message}`));
  });

  test.afterAll(async () => {
    // Cleanup test resources
    if (workflowContext.swarmId) {
      await swarmCoordinator.destroySwarm(workflowContext.swarmId);
    }
    if (workflowContext.sessionId) {
      await claudeCodeOrchestrator.endSession(workflowContext.sessionId);
    }
    await workflowContext.context.close();
  });

  test('Complete Development Workflow - Feature Implementation', async () => {
    const { page } = workflowContext;

    // Step 1: Navigate to application
    await page.goto('http://localhost:3000');
    await expect(page).toHaveTitle(/Agent Feed/);

    // Step 2: Verify application loads
    await expect(page.locator('[data-testid="app-header"]')).toBeVisible();
    await expect(page.locator('[data-testid="agent-dashboard"]')).toBeVisible();

    // Step 3: Initialize Claude Code session
    await page.click('[data-testid="claude-connect-button"]');
    await page.fill('[data-testid="claude-token-input"]', process.env.CLAUDE_TOKEN || 'test-token');
    await page.click('[data-testid="claude-authenticate-button"]');

    // Wait for authentication success
    await expect(page.locator('[data-testid="claude-status-connected"]')).toBeVisible({ timeout: 10000 });

    // Step 4: Create new swarm
    await page.click('[data-testid="create-swarm-button"]');
    await page.selectOption('[data-testid="topology-select"]', 'mesh');
    await page.fill('[data-testid="max-agents-input"]', '8');
    await page.click('[data-testid="initialize-swarm-button"]');

    // Wait for swarm initialization
    await expect(page.locator('[data-testid="swarm-status-active"]')).toBeVisible({ timeout: 15000 });

    // Step 5: Spawn development agents
    const agentTypes = [
      { type: 'planner', name: 'Feature Planner' },
      { type: 'coder', name: 'Frontend Developer' },
      { type: 'tester', name: 'QA Engineer' },
      { type: 'reviewer', name: 'Code Reviewer' }
    ];

    for (const agent of agentTypes) {
      await page.click('[data-testid="spawn-agent-button"]');
      await page.selectOption('[data-testid="agent-type-select"]', agent.type);
      await page.fill('[data-testid="agent-name-input"]', agent.name);
      await page.click('[data-testid="confirm-spawn-button"]');
      
      // Wait for agent to appear in the list
      await expect(
        page.locator(`[data-testid="agent-${agent.type}"][data-status="active"]`)
      ).toBeVisible({ timeout: 10000 });
    }

    // Step 6: Create and assign development task
    await page.click('[data-testid="create-task-button"]');
    await page.fill('[data-testid="task-title"]', 'Implement User Profile Feature');
    await page.fill('[data-testid="task-description"]', `
      Create a comprehensive user profile feature including:
      - Profile viewing and editing
      - Avatar upload functionality
      - Privacy settings
      - Account management
    `);
    
    await page.selectOption('[data-testid="task-priority"]', 'high');
    await page.click('[data-testid="assign-to-swarm-checkbox"]');
    await page.click('[data-testid="create-task-submit"]');

    // Step 7: Monitor task orchestration
    const taskId = await page.locator('[data-testid="active-task-id"]').textContent();
    expect(taskId).toBeTruthy();

    // Wait for planning phase
    await expect(
      page.locator('[data-testid="task-phase-planning"][data-status="completed"]')
    ).toBeVisible({ timeout: 30000 });

    // Wait for development phase
    await expect(
      page.locator('[data-testid="task-phase-development"][data-status="in-progress"]')
    ).toBeVisible({ timeout: 10000 });

    // Step 8: Verify agent coordination
    await page.click('[data-testid="agent-activity-tab"]');
    
    // Check that agents are communicating
    await expect(page.locator('[data-testid="agent-communication-log"]')).toContainText(
      'planner → coder: Feature requirements ready'
    );
    
    await expect(page.locator('[data-testid="agent-communication-log"]')).toContainText(
      'coder → tester: Implementation ready for testing'
    );

    // Step 9: Monitor real-time progress
    const progressBar = page.locator('[data-testid="task-progress-bar"]');
    await expect(progressBar).toHaveAttribute('data-progress', /[1-9]\d*/); // Progress > 0

    // Step 10: Verify file operations through Claude Code
    await page.click('[data-testid="claude-code-tab"]');
    
    // Check that files are being created/modified
    await expect(page.locator('[data-testid="file-operations-log"]')).toContainText(
      'Created: src/components/UserProfile.tsx'
    );
    
    await expect(page.locator('[data-testid="file-operations-log"]')).toContainText(
      'Modified: src/api/routes/users.ts'
    );

    // Step 11: Verify testing phase
    await expect(
      page.locator('[data-testid="task-phase-testing"][data-status="in-progress"]')
    ).toBeVisible({ timeout: 60000 });

    // Check test execution results
    await page.click('[data-testid="test-results-tab"]');
    await expect(page.locator('[data-testid="test-status-passing"]')).toBeVisible({ timeout: 30000 });

    // Step 12: Verify code review phase
    await expect(
      page.locator('[data-testid="task-phase-review"][data-status="in-progress"]')
    ).toBeVisible({ timeout: 30000 });

    await page.click('[data-testid="code-review-tab"]');
    await expect(page.locator('[data-testid="review-status-approved"]')).toBeVisible({ timeout: 30000 });

    // Step 13: Verify task completion
    await expect(
      page.locator('[data-testid="task-status-completed"]')
    ).toBeVisible({ timeout: 120000 }); // 2 minutes for full workflow

    // Step 14: Validate deliverables
    const deliverables = page.locator('[data-testid="task-deliverables"] li');
    await expect(deliverables).toHaveCount(4); // Component, API, Tests, Documentation

    await expect(deliverables.nth(0)).toContainText('UserProfile.tsx');
    await expect(deliverables.nth(1)).toContainText('users.ts API routes');
    await expect(deliverables.nth(2)).toContainText('UserProfile.test.tsx');
    await expect(deliverables.nth(3)).toContainText('User Profile Documentation');

    // Step 15: Verify system performance
    const performanceMetrics = await page.locator('[data-testid="performance-metrics"]').textContent();
    const metrics = JSON.parse(performanceMetrics);
    
    expect(metrics.memoryUsage).toBeLessThan(2048); // Less than 2GB
    expect(metrics.averageResponseTime).toBeLessThan(5000); // Less than 5 seconds
    expect(metrics.errorRate).toBeLessThan(0.05); // Less than 5% error rate
  });

  test('Real-time Collaboration Workflow', async () => {
    const { page } = workflowContext;

    // Navigate to collaborative workspace
    await page.goto('http://localhost:3000/collaborate');

    // Create collaborative session
    await page.click('[data-testid="create-session-button"]');
    await page.fill('[data-testid="session-name"]', 'E2E Collaboration Test');
    await page.selectOption('[data-testid="collaboration-type"]', 'code-review');
    await page.click('[data-testid="start-session-button"]');

    const sessionId = await page.locator('[data-testid="session-id"]').textContent();
    expect(sessionId).toBeTruthy();

    // Spawn collaborative agents
    await page.click('[data-testid="add-reviewer-agent"]');
    await page.click('[data-testid="add-moderator-agent"]');

    // Wait for agents to join
    await expect(page.locator('[data-testid="active-participants"]')).toContainText('2 agents');

    // Upload code for review
    await page.setInputFiles(
      '[data-testid="code-upload"]',
      'tests/fixtures/sample-code.ts'
    );

    // Verify real-time commenting
    await page.click('[data-testid="add-comment-button"]');
    await page.fill('[data-testid="comment-input"]', 'This function needs optimization');
    await page.click('[data-testid="submit-comment"]');

    // Check agent responses
    await expect(
      page.locator('[data-testid="agent-comment"]').first()
    ).toBeVisible({ timeout: 10000 });

    // Verify live typing indicators
    await page.fill('[data-testid="comment-input"]', 'Another comment in progress...');
    await expect(page.locator('[data-testid="typing-indicator"]')).toBeVisible();

    // Test collaborative editing
    await page.click('[data-testid="enable-live-edit"]');
    await page.fill('[data-testid="code-editor"]', '// Collaborative edit test');
    
    // Verify changes are reflected in real-time
    await expect(page.locator('[data-testid="live-changes-indicator"]')).toBeVisible();
  });

  test('Error Recovery and Resilience Workflow', async () => {
    const { page } = workflowContext;

    await page.goto('http://localhost:3000');

    // Initialize system
    await page.click('[data-testid="claude-connect-button"]');
    await page.fill('[data-testid="claude-token-input"]', process.env.CLAUDE_TOKEN || 'test-token');
    await page.click('[data-testid="claude-authenticate-button"]');
    await expect(page.locator('[data-testid="claude-status-connected"]')).toBeVisible();

    // Create swarm
    await page.click('[data-testid="create-swarm-button"]');
    await page.selectOption('[data-testid="topology-select"]', 'mesh');
    await page.click('[data-testid="initialize-swarm-button"]');
    await expect(page.locator('[data-testid="swarm-status-active"]')).toBeVisible();

    // Spawn agents
    await page.click('[data-testid="spawn-agent-button"]');
    await page.selectOption('[data-testid="agent-type-select"]', 'coder');
    await page.click('[data-testid="confirm-spawn-button"]');
    await expect(page.locator('[data-testid="agent-coder"][data-status="active"]')).toBeVisible();

    // Test 1: Network interruption simulation
    await page.evaluate(() => {
      // Simulate network failure
      window.__networkSimulation = 'offline';
    });

    await page.click('[data-testid="create-task-button"]');
    await page.fill('[data-testid="task-title"]', 'Network Test Task');
    await page.click('[data-testid="create-task-submit"]');

    // Verify error handling
    await expect(page.locator('[data-testid="network-error-notification"]')).toBeVisible();
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();

    // Restore network and retry
    await page.evaluate(() => {
      window.__networkSimulation = 'online';
    });

    await page.click('[data-testid="retry-button"]');
    await expect(page.locator('[data-testid="task-created-success"]')).toBeVisible();

    // Test 2: Agent failure recovery
    await page.click('[data-testid="simulate-agent-failure"]');
    await page.selectOption('[data-testid="failure-type"]', 'crash');
    await page.click('[data-testid="trigger-failure"]');

    // Verify automatic recovery
    await expect(
      page.locator('[data-testid="agent-recovery-in-progress"]')
    ).toBeVisible({ timeout: 5000 });

    await expect(
      page.locator('[data-testid="agent-coder"][data-status="active"]')
    ).toBeVisible({ timeout: 15000 });

    // Test 3: High load resilience
    for (let i = 0; i < 10; i++) {
      await page.click('[data-testid="create-task-button"]');
      await page.fill('[data-testid="task-title"]', `Load Test Task ${i}`);
      await page.click('[data-testid="create-task-submit"]');
    }

    // Verify system handles load gracefully
    await expect(page.locator('[data-testid="system-load-warning"]')).toBeVisible();
    await expect(page.locator('[data-testid="auto-scaling-active"]')).toBeVisible();

    // Verify performance doesn't degrade significantly
    const responseTime = await page.locator('[data-testid="avg-response-time"]').textContent();
    expect(parseInt(responseTime)).toBeLessThan(10000); // Less than 10 seconds
  });

  test('Multi-Agent Coordination Complex Workflow', async () => {
    const { page } = workflowContext;

    await page.goto('http://localhost:3000');

    // Setup complex multi-agent environment
    await page.click('[data-testid="claude-connect-button"]');
    await page.fill('[data-testid="claude-token-input"]', process.env.CLAUDE_TOKEN || 'test-token');
    await page.click('[data-testid="claude-authenticate-button"]');
    await expect(page.locator('[data-testid="claude-status-connected"]')).toBeVisible();

    // Create hierarchical swarm for complex coordination
    await page.click('[data-testid="create-swarm-button"]');
    await page.selectOption('[data-testid="topology-select"]', 'hierarchical');
    await page.fill('[data-testid="max-agents-input"]', '12');
    await page.click('[data-testid="initialize-swarm-button"]');
    await expect(page.locator('[data-testid="swarm-status-active"]')).toBeVisible();

    // Spawn coordinated agent team
    const agentTeam = [
      { type: 'hierarchical-coordinator', name: 'Master Coordinator', role: 'coordinator' },
      { type: 'planner', name: 'Project Planner', role: 'planning' },
      { type: 'coder', name: 'Frontend Developer', role: 'frontend' },
      { type: 'coder', name: 'Backend Developer', role: 'backend' },
      { type: 'tester', name: 'QA Engineer', role: 'testing' },
      { type: 'reviewer', name: 'Code Reviewer', role: 'review' },
      { type: 'security-manager', name: 'Security Analyst', role: 'security' },
      { type: 'performance-benchmarker', name: 'Performance Engineer', role: 'performance' }
    ];

    for (const agent of agentTeam) {
      await page.click('[data-testid="spawn-agent-button"]');
      await page.selectOption('[data-testid="agent-type-select"]', agent.type);
      await page.fill('[data-testid="agent-name-input"]', agent.name);
      await page.fill('[data-testid="agent-role-input"]', agent.role);
      await page.click('[data-testid="confirm-spawn-button"]');
      
      await expect(
        page.locator(`[data-testid="agent-${agent.type}"][data-status="active"]`)
      ).toBeVisible({ timeout: 15000 });
    }

    // Create complex project task
    await page.click('[data-testid="create-complex-project"]');
    await page.fill('[data-testid="project-name"]', 'E-commerce Platform');
    await page.fill('[data-testid="project-description"]', `
      Build a complete e-commerce platform with:
      - User authentication and authorization
      - Product catalog with search and filtering
      - Shopping cart and checkout process
      - Payment integration
      - Order management
      - Admin dashboard
      - Mobile responsive design
      - Performance optimization
      - Security hardening
      - Comprehensive testing
    `);

    await page.selectOption('[data-testid="project-complexity"]', 'high');
    await page.click('[data-testid="assign-to-swarm"]');
    await page.click('[data-testid="start-project"]');

    // Monitor complex coordination
    await page.click('[data-testid="coordination-view-tab"]');

    // Verify hierarchical coordination
    await expect(
      page.locator('[data-testid="coordinator-active"]')
    ).toBeVisible({ timeout: 10000 });

    await expect(
      page.locator('[data-testid="task-delegation-tree"]')
    ).toBeVisible();

    // Check task breakdown and assignment
    await expect(page.locator('[data-testid="subtask"]')).toHaveCount(10); // 10 major subtasks

    // Verify parallel execution
    await expect(
      page.locator('[data-testid="parallel-execution-active"]')
    ).toBeVisible({ timeout: 20000 });

    // Monitor cross-agent communication
    await page.click('[data-testid="communication-monitor-tab"]');
    
    const communicationLog = page.locator('[data-testid="agent-communication-log"]');
    await expect(communicationLog).toContainText('coordinator → planner');
    await expect(communicationLog).toContainText('planner → frontend-dev');
    await expect(communicationLog).toContainText('frontend-dev → backend-dev');
    await expect(communicationLog).toContainText('backend-dev → tester');

    // Verify dependency management
    await page.click('[data-testid="dependency-graph-tab"]');
    await expect(page.locator('[data-testid="dependency-graph"]')).toBeVisible();
    
    // Check that dependencies are being resolved correctly
    await expect(
      page.locator('[data-testid="dependency-status-resolved"]')
    ).toHaveCount(5); // At least 5 dependencies resolved

    // Monitor progress synchronization
    const overallProgress = page.locator('[data-testid="overall-progress"]');
    await expect(overallProgress).toHaveAttribute('data-progress', /[1-9]\d*/);

    // Verify consensus building for architectural decisions
    await page.click('[data-testid="consensus-tab"]');
    await expect(page.locator('[data-testid="active-consensus"]')).toBeVisible();
    
    // Check that agents are voting on decisions
    await expect(page.locator('[data-testid="consensus-vote"]')).toHaveCount(3);

    // Verify load balancing across agents
    await page.click('[data-testid="load-balance-tab"]');
    const agentLoads = await page.locator('[data-testid="agent-load"]').allTextContents();
    
    // No single agent should have >40% of the total load
    const maxLoad = Math.max(...agentLoads.map(load => parseInt(load)));
    expect(maxLoad).toBeLessThan(40);

    // Final verification - project completion
    await expect(
      page.locator('[data-testid="project-status-completed"]')
    ).toBeVisible({ timeout: 300000 }); // 5 minutes for complex project

    // Verify all deliverables are present
    const deliverables = page.locator('[data-testid="project-deliverables"] li');
    await expect(deliverables).toHaveCount(10); // All major components delivered
  });

  test('Performance and Scalability Workflow', async () => {
    const { page } = workflowContext;

    await page.goto('http://localhost:3000/performance');

    // Initialize performance testing environment
    await page.click('[data-testid="performance-mode-toggle"]');
    await expect(page.locator('[data-testid="performance-dashboard"]')).toBeVisible();

    // Setup monitoring
    await page.click('[data-testid="start-monitoring"]');
    await expect(page.locator('[data-testid="memory-monitor"]')).toBeVisible();
    await expect(page.locator('[data-testid="cpu-monitor"]')).toBeVisible();

    // Test 1: Memory usage under load
    await page.click('[data-testid="memory-stress-test"]');
    await page.selectOption('[data-testid="stress-level"]', 'high');
    await page.click('[data-testid="start-stress-test"]');

    // Monitor memory usage
    const memoryUsage = page.locator('[data-testid="current-memory-usage"]');
    
    // Wait for stress test to run
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    const memoryValue = await memoryUsage.textContent();
    expect(parseInt(memoryValue)).toBeLessThan(2048); // Less than 2GB

    // Test 2: Response time under concurrent load
    await page.click('[data-testid="response-time-test"]');
    await page.fill('[data-testid="concurrent-users"]', '100');
    await page.click('[data-testid="start-load-test"]');

    await expect(
      page.locator('[data-testid="load-test-running"]')
    ).toBeVisible();

    // Wait for load test completion
    await expect(
      page.locator('[data-testid="load-test-completed"]')
    ).toBeVisible({ timeout: 60000 });

    // Verify response times
    const avgResponseTime = await page.locator('[data-testid="avg-response-time"]').textContent();
    const p95ResponseTime = await page.locator('[data-testid="p95-response-time"]').textContent();

    expect(parseInt(avgResponseTime)).toBeLessThan(5000); // <5s average
    expect(parseInt(p95ResponseTime)).toBeLessThan(10000); // <10s p95

    // Test 3: Agent scalability
    await page.click('[data-testid="agent-scalability-test"]');
    await page.fill('[data-testid="max-agents-stress"]', '50');
    await page.click('[data-testid="start-agent-stress"]');

    // Monitor agent creation rate
    const agentCount = page.locator('[data-testid="active-agent-count"]');
    
    // Wait for scaling to complete
    await new Promise(resolve => setTimeout(resolve, 45000));
    
    const finalAgentCount = await agentCount.textContent();
    expect(parseInt(finalAgentCount)).toBeGreaterThan(20); // Should create at least 20

    // Verify system stability under load
    const errorRate = await page.locator('[data-testid="system-error-rate"]').textContent();
    expect(parseFloat(errorRate)).toBeLessThan(0.05); // <5% error rate
  });
});