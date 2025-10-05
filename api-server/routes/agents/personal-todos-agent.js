import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const router = express.Router();

// Define paths
const AGENT_WORKSPACE = path.join(__dirname, '../../../prod/agent_workspace');
const TASKS_PATH = path.join(AGENT_WORKSPACE, 'personal-todos-agent/tasks.json');

/**
 * GET /api/agents/personal-todos-agent/data
 * Returns aggregated task data for the personal todos agent
 */
router.get('/data', (req, res) => {
  try {
    // Check if tasks file exists
    if (!fs.existsSync(TASKS_PATH)) {
      return res.json({
        success: true,
        data: getEmptyData(),
        metadata: {
          timestamp: new Date().toISOString(),
          agentId: 'personal-todos-agent',
          version: '1.0.0',
          note: 'No tasks file found, returning empty data structure'
        }
      });
    }

    // Read and parse tasks file
    const fileContent = fs.readFileSync(TASKS_PATH, 'utf-8');
    let tasksData;

    try {
      tasksData = JSON.parse(fileContent);
    } catch (parseError) {
      return res.status(500).json({
        success: false,
        error: 'Invalid Data Format',
        message: 'Failed to parse tasks.json file',
        metadata: {
          timestamp: new Date().toISOString(),
          agentId: 'personal-todos-agent'
        }
      });
    }

    // Process and aggregate data
    const aggregatedData = aggregateTaskData(tasksData);

    // Return formatted response
    res.json({
      success: true,
      data: aggregatedData,
      metadata: {
        timestamp: new Date().toISOString(),
        agentId: 'personal-todos-agent',
        version: '1.0.0'
      }
    });

  } catch (error) {
    console.error('Personal Todos Agent data error:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: error.message,
      metadata: {
        timestamp: new Date().toISOString(),
        agentId: 'personal-todos-agent'
      }
    });
  }
});

/**
 * Returns empty data structure when no tasks exist
 */
function getEmptyData() {
  return {
    totalTasks: 0,
    completedTasks: 0,
    activeTasks: 0,
    recentTasks: [],
    priorityDistribution: {
      P0: 0,
      P1: 0,
      P2: 0,
      P3: 0,
      P5: 0,
      P8: 0
    },
    completionRate: 0,
    averageImpactScore: 0,
    statusDistribution: {
      pending: 0,
      in_progress: 0,
      completed: 0
    }
  };
}

/**
 * Aggregates task data from raw tasks file
 */
function aggregateTaskData(tasksData) {
  const activeTasks = tasksData.active_tasks || [];
  const completedTasks = tasksData.completed_tasks || [];
  const allTasks = [...activeTasks, ...completedTasks];

  // Calculate totals
  const totalTasks = allTasks.length;
  const completedCount = completedTasks.length;
  const activeCount = activeTasks.length;

  // Calculate priority distribution
  const priorityDistribution = {
    P0: 0,
    P1: 0,
    P2: 0,
    P3: 0,
    P5: 0,
    P8: 0
  };

  allTasks.forEach(task => {
    if (task.priority && priorityDistribution.hasOwnProperty(task.priority)) {
      priorityDistribution[task.priority]++;
    }
  });

  // Calculate status distribution
  const statusDistribution = {
    pending: 0,
    in_progress: 0,
    completed: 0
  };

  allTasks.forEach(task => {
    if (task.status && statusDistribution.hasOwnProperty(task.status)) {
      statusDistribution[task.status]++;
    }
  });

  // Calculate completion rate
  const completionRate = totalTasks > 0
    ? Math.round((completedCount / totalTasks) * 1000) / 10
    : 0;

  // Calculate average impact score
  const totalImpact = allTasks.reduce((sum, task) => {
    return sum + (task.impact_score || 0);
  }, 0);
  const averageImpactScore = totalTasks > 0
    ? Math.round((totalImpact / totalTasks) * 10) / 10
    : 0;

  // Get recent tasks (last 5 active tasks, sorted by updated_at)
  const recentTasks = [...activeTasks]
    .sort((a, b) => {
      const dateA = new Date(a.updated_at || a.created_at);
      const dateB = new Date(b.updated_at || b.created_at);
      return dateB - dateA;
    })
    .slice(0, 5)
    .map(task => ({
      id: task.id,
      title: task.title,
      priority: task.priority,
      status: task.status,
      impact_score: task.impact_score,
      completion_percentage: task.completion_percentage || 0,
      updated_at: task.updated_at || task.created_at
    }));

  return {
    totalTasks,
    completedTasks: completedCount,
    activeTasks: activeCount,
    recentTasks,
    priorityDistribution,
    completionRate,
    averageImpactScore,
    statusDistribution
  };
}

export default router;
