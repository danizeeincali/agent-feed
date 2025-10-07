/**
 * Checklist Integration Example
 *
 * Demonstrates how to integrate the Checklist component
 * into a dynamic agent page with real API endpoints
 */

import React, { useState, useEffect } from 'react';
import { Checklist, ChecklistItem } from './Checklist';
import { apiService } from '../../services/api';

/**
 * Example: Task Management Dashboard
 * Real-world use case with API integration
 */
export const TaskManagementDashboard: React.FC = () => {
  const [tasks, setTasks] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load tasks from API on mount
  useEffect(() => {
    const loadTasks = async () => {
      try {
        setLoading(true);
        // Example API call - adjust endpoint as needed
        const response = await fetch('/api/tasks/checklist');

        if (!response.ok) {
          throw new Error('Failed to load tasks');
        }

        const data = await response.json();
        setTasks(data.tasks || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    loadTasks();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">Loading tasks...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Daily Task Checklist
        </h1>
        <p className="text-gray-600 mb-6">
          Track your daily progress and stay organized
        </p>

        <Checklist
          items={tasks}
          allowEdit={true}
          onChange="/api/tasks/update"
          className="mb-4"
        />
      </div>
    </div>
  );
};

/**
 * Example: Agent Workspace Setup
 * Onboarding checklist for new agents
 */
export const AgentOnboardingChecklist: React.FC<{ agentId: string }> = ({ agentId }) => {
  const [setupTasks] = useState<ChecklistItem[]>([
    {
      id: 'workspace-init',
      text: 'Initialize workspace for {{agentName}}',
      checked: false,
      metadata: {
        agentName: agentId,
        description: 'Set up the base directory structure'
      }
    },
    {
      id: 'config-load',
      text: 'Load configuration settings',
      checked: false,
      metadata: {
        description: 'Import agent-specific settings'
      }
    },
    {
      id: 'api-connect',
      text: 'Establish API connections',
      checked: false,
      metadata: {
        description: 'Connect to required external services'
      }
    },
    {
      id: 'test-run',
      text: 'Run initial test suite',
      checked: false,
      metadata: {
        description: 'Verify all systems are operational'
      }
    },
    {
      id: 'ready',
      text: 'Mark agent as ready',
      checked: false,
      metadata: {
        description: 'Finalize setup and activate agent'
      }
    }
  ]);

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        Agent Setup Progress
      </h2>

      <Checklist
        items={setupTasks}
        allowEdit={true}
        onChange={`/api/agents/${agentId}/setup/update`}
      />
    </div>
  );
};

/**
 * Example: Dynamic Page Component
 * Shows how to use Checklist in a dynamic page renderer
 */
export const DynamicPageChecklistExample: React.FC<{
  pageData: {
    checklist?: {
      items: ChecklistItem[];
      allowEdit?: boolean;
      onChange?: string;
    }
  }
}> = ({ pageData }) => {
  const { checklist } = pageData;

  if (!checklist) {
    return (
      <div className="text-gray-500 text-sm">
        No checklist data available
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <Checklist
        items={checklist.items}
        allowEdit={checklist.allowEdit ?? true}
        onChange={checklist.onChange}
      />
    </div>
  );
};

/**
 * Example: Project Milestone Tracker
 * Track project milestones with metadata
 */
export const ProjectMilestoneTracker: React.FC<{ projectId: string }> = ({ projectId }) => {
  const [milestones] = useState<ChecklistItem[]>([
    {
      id: 'm1',
      text: 'Project kickoff meeting - {{date}}',
      checked: true,
      metadata: {
        date: '2025-10-01',
        description: 'Team alignment and goal setting'
      }
    },
    {
      id: 'm2',
      text: 'Requirements gathering complete',
      checked: true,
      metadata: {
        description: 'All stakeholder requirements documented'
      }
    },
    {
      id: 'm3',
      text: 'Design phase completion - Due {{deadline}}',
      checked: false,
      metadata: {
        deadline: '2025-10-15',
        description: 'UI/UX designs approved'
      }
    },
    {
      id: 'm4',
      text: 'Development sprint 1',
      checked: false,
      metadata: {
        description: 'Core features implementation'
      }
    },
    {
      id: 'm5',
      text: 'Testing and QA',
      checked: false,
      metadata: {
        description: 'Comprehensive testing coverage'
      }
    },
    {
      id: 'm6',
      text: 'Production deployment',
      checked: false,
      metadata: {
        description: 'Go-live to production environment'
      }
    }
  ]);

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">
          Project Milestones
        </h2>
        <span className="text-sm text-gray-500">
          Project ID: {projectId}
        </span>
      </div>

      <Checklist
        items={milestones}
        allowEdit={true}
        onChange={`/api/projects/${projectId}/milestones/update`}
        className="max-w-3xl"
      />
    </div>
  );
};

/**
 * Example: Backend API Handler
 * Express.js example for handling checklist updates
 */
export const exampleAPIHandler = `
// Example Express.js API handler for checklist updates
app.post('/api/checklist/update', async (req, res) => {
  try {
    const { itemId, checked, item, timestamp } = req.body;

    // Validate request
    if (!itemId || typeof checked !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data'
      });
    }

    // Update database (example using PostgreSQL)
    const result = await db.query(
      'UPDATE checklist_items SET checked = $1, updated_at = $2 WHERE id = $3',
      [checked, timestamp, itemId]
    );

    // Log the change
    await db.query(
      'INSERT INTO checklist_history (item_id, action, user_id, timestamp) VALUES ($1, $2, $3, $4)',
      [itemId, checked ? 'checked' : 'unchecked', req.user?.id, timestamp]
    );

    // Return success
    res.json({
      success: true,
      data: {
        itemId,
        checked,
        updatedAt: timestamp
      }
    });

  } catch (error) {
    console.error('Checklist update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update checklist item'
    });
  }
});
`;

/**
 * Example: Real-time Updates with WebSocket
 * Shows how to add real-time synchronization
 */
export const RealtimeChecklistExample: React.FC = () => {
  const [tasks, setTasks] = useState<ChecklistItem[]>([
    { id: '1', text: 'Task 1', checked: false },
    { id: '2', text: 'Task 2', checked: false }
  ]);

  useEffect(() => {
    // Subscribe to real-time updates
    const handleTaskUpdate = (data: any) => {
      if (data.type === 'checklist_updated') {
        setTasks(prevTasks =>
          prevTasks.map(task =>
            task.id === data.itemId
              ? { ...task, checked: data.checked }
              : task
          )
        );
      }
    };

    apiService.on('checklist_updated', handleTaskUpdate);

    return () => {
      apiService.off('checklist_updated', handleTaskUpdate);
    };
  }, []);

  return (
    <div className="bg-white rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Real-time Checklist</h2>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs text-gray-600">Live</span>
        </div>
      </div>

      <Checklist
        items={tasks}
        allowEdit={true}
        onChange="/api/checklist/realtime-update"
      />
    </div>
  );
};

export default TaskManagementDashboard;
