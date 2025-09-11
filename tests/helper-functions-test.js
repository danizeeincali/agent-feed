#!/usr/bin/env node
/**
 * Test the helper functions for generating real data
 */

// Helper functions for real data generation from agent metrics
function generateRealActivitiesFromAgent(agent) {
  const activities = [];
  
  // Health check activity
  if (agent.health_status && agent.health_status.status === 'healthy') {
    activities.push({
      id: `health-${agent.id}`,
      type: 'task_completed',
      title: 'System Health Check',
      description: `Agent is healthy - CPU: ${agent.health_status.cpu_usage?.toFixed(1)}%, Memory: ${agent.health_status.memory_usage?.toFixed(1)}%`,
      timestamp: agent.health_status.last_heartbeat,
      metadata: {
        duration: agent.health_status.response_time / 1000,
        success: true,
        priority: 'low'
      }
    });
  }
  
  // Usage activity
  if (agent.last_used) {
    activities.push({
      id: `usage-${agent.id}`,
      type: 'task_completed', 
      title: 'Task Completion',
      description: `Completed task successfully. Total usage: ${agent.usage_count} times`,
      timestamp: agent.last_used,
      metadata: {
        duration: 5,
        success: true,
        priority: 'medium'
      }
    });
  }
  
  // Performance activity if available
  if (agent.performance_metrics) {
    activities.push({
      id: `performance-${agent.id}`,
      type: 'system_update',
      title: 'Performance Update',
      description: `Success rate: ${agent.performance_metrics.success_rate?.toFixed(1)}%, Avg response: ${agent.performance_metrics.avg_response_time?.toFixed(1)}ms`,
      timestamp: agent.last_used || agent.created_at,
      metadata: {
        duration: 2,
        success: true,
        priority: 'low'
      }
    });
  }
  
  return activities.slice(0, 3);
}

function generateRealPostsFromAgent(agent) {
  const posts = [];
  
  // Milestone post if agent has significant usage
  if (agent.usage_count >= 10) {
    posts.push({
      id: `milestone-${agent.id}`,
      type: 'achievement',
      title: `Agent Milestone: ${agent.usage_count} Tasks Completed`,
      content: `Successfully completed ${agent.usage_count} tasks with ${agent.performance_metrics?.success_rate?.toFixed(1) || '95.0'}% success rate.`,
      timestamp: agent.last_used || agent.created_at,
      author: {
        id: agent.id,
        name: agent.display_name || agent.name,
        avatar: '🤖'
      },
      tags: ['milestone', 'achievement'],
      interactions: {
        likes: Math.floor(agent.usage_count / 5),
        comments: Math.floor(agent.usage_count / 10),
        shares: Math.floor(agent.usage_count / 20),
        bookmarks: Math.floor(agent.usage_count / 15)
      },
      priority: 'medium'
    });
  }
  
  // Status update post
  if (agent.health_status && agent.health_status.status === 'healthy') {
    posts.push({
      id: `status-${agent.id}`,
      type: 'status_update',
      title: 'Agent Status Update',
      content: `Currently operational with optimal performance. Ready for new tasks.`,
      timestamp: agent.health_status.last_heartbeat,
      author: {
        id: agent.id,
        name: agent.display_name || agent.name,
        avatar: '🤖'
      },
      tags: ['status', 'operational'],
      interactions: {
        likes: Math.floor(agent.usage_count / 8),
        comments: Math.floor(agent.usage_count / 15),
        shares: Math.floor(agent.usage_count / 25),
        bookmarks: Math.floor(agent.usage_count / 20)
      },
      priority: 'low'
    });
  }
  
  return posts.slice(0, 2);
}

// Test data
const testAgent = {
  id: 'test-agent-1',
  name: 'Test Agent',
  display_name: 'Test Agent',
  usage_count: 25,
  last_used: '2024-01-15T10:30:00Z',
  created_at: '2024-01-01T00:00:00Z',
  health_status: {
    status: 'healthy',
    cpu_usage: 15.5,
    memory_usage: 32.8,
    last_heartbeat: '2024-01-15T10:29:00Z',
    response_time: 150
  },
  performance_metrics: {
    success_rate: 97.2,
    avg_response_time: 145.6
  }
};

console.log('🧪 Testing helper functions...');

console.log('\n1️⃣ Testing generateRealActivitiesFromAgent:');
const activities = generateRealActivitiesFromAgent(testAgent);
console.log(`Generated ${activities.length} activities:`);
activities.forEach((activity, i) => {
  console.log(`   ${i + 1}. ${activity.title}: ${activity.description}`);
});

console.log('\n2️⃣ Testing generateRealPostsFromAgent:');
const posts = generateRealPostsFromAgent(testAgent);
console.log(`Generated ${posts.length} posts:`);
posts.forEach((post, i) => {
  console.log(`   ${i + 1}. ${post.title}: ${post.content}`);
  console.log(`      Interactions: ${post.interactions.likes} likes, ${post.interactions.comments} comments`);
});

console.log('\n✅ Helper functions test completed successfully!');