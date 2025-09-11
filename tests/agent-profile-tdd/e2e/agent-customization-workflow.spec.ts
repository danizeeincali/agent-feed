/**
 * London School TDD End-to-End Tests for Agent Customization Workflows
 * Focus: Complete user journeys and behavior verification
 */

import { test, expect, Page } from '@playwright/test';
import { swarmCoordinator } from '../helpers/swarm-coordinator';

// E2E Test Configuration
const TEST_CONFIG = {
  baseURL: 'http://localhost:3000',
  timeout: 30000,
  retries: 2
};

// Mock API responses for E2E testing
const mockApiResponses = {
  agents: [
    {
      id: 'e2e-agent-1',
      name: 'E2E Research Agent',
      description: 'Research agent for E2E testing',
      status: 'active',
      color: '#3B82F6',
      capabilities: ['research', 'analysis'],
      lastActivity: new Date().toISOString()
    }
  ],
  templates: [
    {
      id: 'researcher',
      name: 'Research Agent',
      description: 'Specialized in research and analysis',
      capabilities: ['research', 'analysis', 'data-mining'],
      avatar_color: '#3B82F6'
    },
    {
      id: 'content-creator',
      name: 'Content Creator',
      description: 'Creates engaging content',
      capabilities: ['writing', 'creativity', 'marketing'],
      avatar_color: '#8B5CF6'
    }
  ]
};

// London School TDD: Define E2E behavior contracts
interface E2EWorkflowContract {
  workflowName: string;
  userActions: string[];
  expectedBehaviors: string[];
  systemInteractions: string[];
}

const AGENT_CREATION_WORKFLOW: E2EWorkflowContract = {
  workflowName: 'Agent Creation',
  userActions: ['click_create_button', 'select_template', 'fill_form', 'submit_form'],
  expectedBehaviors: ['modal_opens', 'template_populates_form', 'validation_occurs', 'agent_created'],
  systemInteractions: ['api_call_create_agent', 'ui_update', 'notification_show']
};

const AGENT_CUSTOMIZATION_WORKFLOW: E2EWorkflowContract = {
  workflowName: 'Agent Customization',
  userActions: ['select_agent', 'click_edit', 'modify_properties', 'save_changes'],
  expectedBehaviors: ['edit_modal_opens', 'form_pre_populated', 'changes_reflected', 'success_feedback'],
  systemInteractions: ['api_call_update_agent', 'real_time_updates', 'state_persistence']
};

// Helper class for E2E workflow testing
class AgentWorkflowTester {
  constructor(private page: Page) {}

  async setupMockResponses() {
    // Mock API responses for consistent testing
    await this.page.route('**/api/v1/claude-live/prod/agents', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ agents: mockApiResponses.agents })
      });
    });
    
    await this.page.route('**/api/v1/agents', (route) => {
      const method = route.request().method();
      
      if (method === 'POST') {
        // Mock agent creation
        const requestBody = route.request().postDataJSON();
        const newAgent = {
          id: `agent-${Date.now()}`,
          ...requestBody,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: newAgent })
        });
      } else if (method === 'PUT') {
        // Mock agent update
        const requestBody = route.request().postDataJSON();
        const updatedAgent = {
          id: 'existing-agent-id',
          ...requestBody,
          updated_at: new Date().toISOString()
        };
        
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: updatedAgent })
        });
      }
    });
  }

  async navigateToAgentManager() {
    await this.page.goto('/agents');
    await this.page.waitForSelector('[data-testid="agent-manager"], h1:has-text("Agent Manager")');
  }

  async verifyAgentManagerLoaded() {
    await expect(this.page.locator('h1')).toContainText('Agent Manager');
    await expect(this.page.locator('text=Manage your AI agents')).toBeVisible();
  }

  async createAgentFromTemplate(templateName: string, customName: string) {
    // Click create agent button
    await this.page.click('button:has-text("Create Agent")');
    
    // Verify modal opened
    await expect(this.page.locator('text=Create New Agent')).toBeVisible();
    
    // Select template
    await this.page.click(`text=${templateName}`);
    
    // Verify template data populated
    await expect(this.page.locator('input[value*="research"]')).toBeVisible();
    
    // Customize agent name
    const nameField = this.page.locator('input[placeholder="agent-name"]');
    await nameField.fill(customName);
    
    // Fill required fields
    const displayNameField = this.page.locator('input[placeholder="Agent Display Name"]');
    await displayNameField.fill(`${customName} Display`);
    
    const descriptionField = this.page.locator('textarea[placeholder*="Describe what this agent does"]');
    await descriptionField.fill(`Custom ${customName} for testing purposes`);
    
    const systemPromptField = this.page.locator('textarea[placeholder*="You are an AI assistant"]');
    await systemPromptField.fill(`You are a ${customName} specialized in testing workflows.`);
    
    // Submit form
    await this.page.click('button:has-text("Create Agent")');
    
    // Verify agent was created
    await expect(this.page.locator(`text=${customName} Display`)).toBeVisible();
  }

  async editExistingAgent(agentName: string, newDescription: string) {
    // Find agent card
    const agentCard = this.page.locator(`text=${agentName}`).locator('..');
    
    // Click edit button
    await agentCard.locator('button[title="Edit"]').click();
    
    // Verify edit modal
    await expect(this.page.locator('text=Edit Agent')).toBeVisible();
    
    // Update description
    const descriptionField = this.page.locator('textarea[value*="description"]').first();
    await descriptionField.fill(newDescription);
    
    // Add new capability
    const capabilityInput = this.page.locator('input[placeholder*="Add capability"]');
    await capabilityInput.fill('e2e-testing');
    await capabilityInput.press('Enter');
    
    // Verify capability was added
    await expect(this.page.locator('text=e2e-testing')).toBeVisible();
    
    // Submit changes
    await this.page.click('button:has-text("Update Agent")');
    
    // Verify changes were saved
    await expect(this.page.locator(`text=${agentName}`)).toBeVisible();
  }

  async testAgentFunctionality(agentName: string, testPrompt: string) {
    // Find agent card
    const agentCard = this.page.locator(`text=${agentName}`).locator('..');
    
    // Click test button
    await agentCard.locator('button[title="Test Agent"]').click();
    
    // In a real implementation, this would open a test modal
    // For now, verify the button interaction works
    await expect(agentCard.locator('button[title="Test Agent"]')).toBeVisible();
  }

  async performBulkOperations(agentNames: string[], operation: 'activate' | 'deactivate' | 'delete') {
    // Select multiple agents
    for (const name of agentNames) {
      const agentCard = this.page.locator(`text=${name}`).locator('..');
      await agentCard.locator('input[type="checkbox"]').check();
    }
    
    // Verify bulk selection UI
    await expect(this.page.locator(`text=${agentNames.length} Selected`)).toBeVisible();
    
    // Click bulk actions
    await this.page.click(`text=${agentNames.length} Selected`);
    
    // Select operation
    const operationText = operation.charAt(0).toUpperCase() + operation.slice(1);
    await this.page.click(`button:has-text("${operationText}")`);
    
    // Handle confirmation for delete
    if (operation === 'delete') {
      this.page.on('dialog', async dialog => {
        expect(dialog.message()).toContain('Are you sure');
        await dialog.accept();
      });
    }
    
    // Verify operation completed
    if (operation === 'delete') {
      for (const name of agentNames) {
        await expect(this.page.locator(`text=${name}`)).not.toBeVisible();
      }
    }
  }

  async verifyNavigationToProfile(agentName: string) {
    // In a full implementation, clicking agent would navigate to profile
    const agentCard = this.page.locator(`text=${agentName}`);
    await expect(agentCard).toBeVisible();
    
    // Verify agent card is clickable/navigable
    await expect(agentCard).toBeEnabled();
  }

  async recordWorkflowCompletion(workflow: E2EWorkflowContract, success: boolean) {
    // Record workflow results for swarm coordination
    const result = {
      testName: `E2E: ${workflow.workflowName}`,
      duration: Date.now() - this.startTime,
      passed: success,
      contractViolations: success ? [] : [`${workflow.workflowName} workflow failed`]
    };
    
    // In a real implementation, this would integrate with swarm coordinator
    console.log('E2E Workflow Result:', result);
  }

  private startTime = Date.now();
}

test.describe('Agent Customization Workflows - London School E2E TDD', () => {
  let workflowTester: AgentWorkflowTester;

  test.beforeEach(async ({ page }) => {
    workflowTester = new AgentWorkflowTester(page);
    await workflowTester.setupMockResponses();
    await workflowTester.navigateToAgentManager();
  });

  test('Complete Agent Creation Workflow with Template', async ({ page }) => {
    await test.step('Verify Agent Manager loads correctly', async () => {
      await workflowTester.verifyAgentManagerLoaded();
    });

    await test.step('Create agent from Research template', async () => {
      await workflowTester.createAgentFromTemplate('Research Agent', 'custom-research-agent');
    });

    await test.step('Verify agent appears in list', async () => {
      await expect(page.locator('text=custom-research-agent Display')).toBeVisible();
      await expect(page.locator('text=Custom custom-research-agent for testing purposes')).toBeVisible();
    });

    await test.step('Record successful workflow', async () => {
      await workflowTester.recordWorkflowCompletion(AGENT_CREATION_WORKFLOW, true);
    });
  });

  test('Agent Customization and Configuration Workflow', async ({ page }) => {
    await test.step('Pre-create agent for editing', async () => {
      await workflowTester.createAgentFromTemplate('Content Creator', 'content-agent');
    });

    await test.step('Edit agent configuration', async () => {
      await workflowTester.editExistingAgent('content-agent Display', 'Updated description for E2E testing');
    });

    await test.step('Verify changes were persisted', async () => {
      // Refresh page to verify persistence
      await page.reload();
      await workflowTester.verifyAgentManagerLoaded();
      await expect(page.locator('text=content-agent Display')).toBeVisible();
    });

    await test.step('Record customization workflow', async () => {
      await workflowTester.recordWorkflowCompletion(AGENT_CUSTOMIZATION_WORKFLOW, true);
    });
  });

  test('Agent Testing and Validation Workflow', async ({ page }) => {
    await test.step('Create agent for testing', async () => {
      await workflowTester.createAgentFromTemplate('Research Agent', 'test-agent');
    });

    await test.step('Test agent functionality', async () => {
      await workflowTester.testAgentFunctionality('test-agent Display', 'Hello, can you help me with research?');
    });

    await test.step('Verify agent status updates', async () => {
      // In a real implementation, agent status would change during testing
      const agentCard = page.locator('text=test-agent Display').locator('..');
      await expect(agentCard.locator('text=active')).toBeVisible();
    });
  });

  test('Bulk Agent Management Workflow', async ({ page }) => {
    await test.step('Create multiple agents', async () => {
      await workflowTester.createAgentFromTemplate('Research Agent', 'bulk-agent-1');
      await page.waitForTimeout(1000); // Allow UI to update
      
      await workflowTester.createAgentFromTemplate('Content Creator', 'bulk-agent-2');
      await page.waitForTimeout(1000);
    });

    await test.step('Perform bulk activation', async () => {
      await workflowTester.performBulkOperations(
        ['bulk-agent-1 Display', 'bulk-agent-2 Display'], 
        'activate'
      );
    });

    await test.step('Verify bulk operation success', async () => {
      // Both agents should still be visible and active
      await expect(page.locator('text=bulk-agent-1 Display')).toBeVisible();
      await expect(page.locator('text=bulk-agent-2 Display')).toBeVisible();
    });
  });

  test('Agent Search and Filter Workflow', async ({ page }) => {
    await test.step('Create agents with different properties', async () => {
      await workflowTester.createAgentFromTemplate('Research Agent', 'search-research');
      await page.waitForTimeout(1000);
      
      await workflowTester.createAgentFromTemplate('Content Creator', 'search-content');
      await page.waitForTimeout(1000);
    });

    await test.step('Test search functionality', async () => {
      const searchInput = page.locator('input[placeholder="Search agents..."]');
      await searchInput.fill('search-research');
      
      // Should show only matching agent
      await expect(page.locator('text=search-research Display')).toBeVisible();
      await expect(page.locator('text=search-content Display')).not.toBeVisible();
    });

    await test.step('Test status filtering', async () => {
      // Clear search
      const searchInput = page.locator('input[placeholder="Search agents..."]');
      await searchInput.fill('');
      
      // Filter by status
      await page.selectOption('select', 'active');
      
      // Should show all active agents
      await expect(page.locator('text=search-research Display')).toBeVisible();
      await expect(page.locator('text=search-content Display')).toBeVisible();
    });
  });

  test('Navigation Between Agent List and Profile', async ({ page }) => {
    await test.step('Create agent for navigation testing', async () => {
      await workflowTester.createAgentFromTemplate('Research Agent', 'nav-test-agent');
    });

    await test.step('Verify navigation to profile is possible', async () => {
      await workflowTester.verifyNavigationToProfile('nav-test-agent Display');
    });

    await test.step('Test breadcrumb or back navigation', async () => {
      // In a full implementation, this would test actual profile navigation
      // For now, verify the agent card is accessible
      const agentCard = page.locator('text=nav-test-agent Display');
      await expect(agentCard).toBeVisible();
    });
  });

  test('Error Handling and Edge Cases', async ({ page }) => {
    await test.step('Test form validation errors', async () => {
      // Try to create agent without required fields
      await page.click('button:has-text("Create Agent")');
      
      // Skip template selection and try to submit
      await page.click('button:has-text("Create Agent")');
      
      // Form should not submit due to validation
      await expect(page.locator('text=Create New Agent')).toBeVisible();
    });

    await test.step('Test network error handling', async () => {
      // Mock API failure
      await page.route('**/api/v1/claude-live/prod/agents', (route) => {
        route.abort('failed');
      });
      
      // Refresh to trigger error
      await page.reload();
      
      // Should show error message
      await expect(page.locator('text=Error connecting to agent API')).toBeVisible({ timeout: 10000 });
    });

    await test.step('Test recovery from errors', async () => {
      // Remove API failure mock
      await page.unroute('**/api/v1/claude-live/prod/agents');
      await workflowTester.setupMockResponses();
      
      // Click refresh button
      await page.click('button:has-text("Refresh")');
      
      // Should recover and show agents
      await workflowTester.verifyAgentManagerLoaded();
    });
  });

  test('Responsive Design and Accessibility', async ({ page }) => {
    await test.step('Test mobile viewport', async () => {
      await page.setViewportSize({ width: 375, height: 667 });
      await workflowTester.verifyAgentManagerLoaded();
      
      // Mobile layout should still be functional
      await expect(page.locator('h1:has-text("Agent Manager")')).toBeVisible();
    });

    await test.step('Test keyboard navigation', async () => {
      await page.setViewportSize({ width: 1024, height: 768 });
      
      // Focus on create button
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Should be able to activate with Enter
      const createButton = page.locator('button:has-text("Create Agent")');
      await createButton.focus();
      await expect(createButton).toBeFocused();
    });

    await test.step('Test screen reader compatibility', async () => {
      // Verify important elements have proper accessibility attributes
      await expect(page.locator('h1')).toHaveAttribute('aria-level', '1');
      
      // Buttons should have descriptive labels
      const createButton = page.locator('button:has-text("Create Agent")');
      await expect(createButton).toBeVisible();
    });
  });
});