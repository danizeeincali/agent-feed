# Mock Data Elimination Regression Test Report
Generated: 2025-09-23T03:26:42.831Z

MOCK CONTAMINATION ANALYSIS REPORT
===================================
Total files scanned: 456
Contaminated files: 74
Total contaminations found: 370

SEVERITY BREAKDOWN:
- Critical: 370 (Math.random, mock variables)
- High: 0 (Unknown, N/A strings)
- Medium: 0 (Loading strings)

STATUS: ❌ CONTAMINATED

## Detailed Findings

❌ MOCK CONTAMINATION DETECTED

📁 frontend/src/WorkingApp.tsx
  🚨 Line 22 [CRITICAL]: math_random
     Code: priority: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)],
  🚨 Line 22 [CRITICAL]: math_random
     Code: priority: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)],
  🚨 Line 24 [CRITICAL]: math_random
     Code: tool: ['thinking', 'read', 'search', 'write', 'edit', 'bash'][Math.floor(Math.random() * 6)]
  🚨 Line 24 [CRITICAL]: math_random
     Code: tool: ['thinking', 'read', 'search', 'write', 'edit', 'bash'][Math.floor(Math.random() * 6)]

📁 frontend/src/components/ActivityPanel.tsx
  🚨 Line 165 [CRITICAL]: math_random
     Code: agentId: ['chief-of-staff', 'performance', 'security', 'frontend', 'backend'][Math.floor(Math.random() * 5)],
  🚨 Line 165 [CRITICAL]: math_random
     Code: agentId: ['chief-of-staff', 'performance', 'security', 'frontend', 'backend'][Math.floor(Math.random() * 5)],
  🚨 Line 166 [CRITICAL]: math_random
     Code: agentName: ['Chief of Staff Agent', 'Performance Agent', 'Security Agent', 'Frontend Agent', 'Backend Agent'][Math.floor(Math.random() * 5)],
  🚨 Line 166 [CRITICAL]: math_random
     Code: agentName: ['Chief of Staff Agent', 'Performance Agent', 'Security Agent', 'Frontend Agent', 'Backend Agent'][Math.floor(Math.random() * 5)],
  🚨 Line 167 [CRITICAL]: math_random
     Code: type: ['task_start', 'task_complete', 'coordination', 'workflow_update'][Math.floor(Math.random() * 4)] as any,
  🚨 Line 167 [CRITICAL]: math_random
     Code: type: ['task_start', 'task_complete', 'coordination', 'workflow_update'][Math.floor(Math.random() * 4)] as any,
  🚨 Line 168 [CRITICAL]: math_random
     Code: title: ['Processing Request', 'Analyzing Data', 'Coordinating Tasks', 'Updating Workflow'][Math.floor(Math.random() * 4)],
  🚨 Line 168 [CRITICAL]: math_random
     Code: title: ['Processing Request', 'Analyzing Data', 'Coordinating Tasks', 'Updating Workflow'][Math.floor(Math.random() * 4)],
  🚨 Line 171 [CRITICAL]: math_random
     Code: priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as any,
  🚨 Line 171 [CRITICAL]: math_random
     Code: priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as any,
  🚨 Line 172 [CRITICAL]: math_random
     Code: metadata: { progress: Math.floor(Math.random() * 100) }
  🚨 Line 172 [CRITICAL]: math_random
     Code: metadata: { progress: Math.floor(Math.random() * 100) }

📁 frontend/src/components/AgentProfile.tsx
  🚨 Line 229 [CRITICAL]: math_random
     Code: experience_hours: Math.floor(Math.random() * 1000) + 100
  🚨 Line 229 [CRITICAL]: math_random
     Code: experience_hours: Math.floor(Math.random() * 1000) + 100
  🚨 Line 232 [CRITICAL]: math_random
     Code: tasksCompleted: Math.floor(Math.random() * 1000) + 100,
  🚨 Line 232 [CRITICAL]: math_random
     Code: tasksCompleted: Math.floor(Math.random() * 1000) + 100,
  🚨 Line 233 [CRITICAL]: math_random
     Code: successRate: 95 + Math.random() * 5,
  🚨 Line 237 [CRITICAL]: math_random
     Code: todayTasks: Math.floor(Math.random() * 20) + 5,
  🚨 Line 237 [CRITICAL]: math_random
     Code: todayTasks: Math.floor(Math.random() * 20) + 5,
  🚨 Line 238 [CRITICAL]: math_random
     Code: weeklyTasks: Math.floor(Math.random() * 100) + 50,
  🚨 Line 238 [CRITICAL]: math_random
     Code: weeklyTasks: Math.floor(Math.random() * 100) + 50,
  🚨 Line 239 [CRITICAL]: math_random
     Code: monthlyTasks: Math.floor(Math.random() * 400) + 200
  🚨 Line 239 [CRITICAL]: math_random
     Code: monthlyTasks: Math.floor(Math.random() * 400) + 200
  🚨 Line 242 [CRITICAL]: math_random
     Code: efficiency: 90 + Math.floor(Math.random() * 10),
  🚨 Line 242 [CRITICAL]: math_random
     Code: efficiency: 90 + Math.floor(Math.random() * 10),
  🚨 Line 243 [CRITICAL]: math_random
     Code: reliability: 95 + Math.floor(Math.random() * 5),
  🚨 Line 243 [CRITICAL]: math_random
     Code: reliability: 95 + Math.floor(Math.random() * 5),
  🚨 Line 244 [CRITICAL]: math_random
     Code: quality: 85 + Math.floor(Math.random() * 15),
  🚨 Line 244 [CRITICAL]: math_random
     Code: quality: 85 + Math.floor(Math.random() * 15),
  🚨 Line 245 [CRITICAL]: math_random
     Code: collaboration: 90 + Math.floor(Math.random() * 10)
  🚨 Line 245 [CRITICAL]: math_random
     Code: collaboration: 90 + Math.floor(Math.random() * 10)
  🚨 Line 259 [CRITICAL]: math_random
     Code: activeTasks: Math.floor(Math.random() * 5) + 1,
  🚨 Line 259 [CRITICAL]: math_random
     Code: activeTasks: Math.floor(Math.random() * 5) + 1,
  🚨 Line 260 [CRITICAL]: math_random
     Code: queuedTasks: Math.floor(Math.random() * 10) + 2,
  🚨 Line 260 [CRITICAL]: math_random
     Code: queuedTasks: Math.floor(Math.random() * 10) + 2,

📁 frontend/src/components/BulletproofActivityPanel.tsx
  🚨 Line 93 [CRITICAL]: math_random
     Code: id: safeString(activity.id, `activity-${Date.now()}-${Math.random()}`),
  🚨 Line 402 [CRITICAL]: math_random
     Code: const randomIndex = Math.floor(Math.random() * agentNames.length);
  🚨 Line 402 [CRITICAL]: math_random
     Code: const randomIndex = Math.floor(Math.random() * agentNames.length);
  🚨 Line 405 [CRITICAL]: math_random
     Code: id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
  🚨 Line 408 [CRITICAL]: math_random
     Code: type: types[Math.floor(Math.random() * types.length)],
  🚨 Line 408 [CRITICAL]: math_random
     Code: type: types[Math.floor(Math.random() * types.length)],
  🚨 Line 409 [CRITICAL]: math_random
     Code: title: titles[Math.floor(Math.random() * titles.length)],
  🚨 Line 409 [CRITICAL]: math_random
     Code: title: titles[Math.floor(Math.random() * titles.length)],
  🚨 Line 412 [CRITICAL]: math_random
     Code: priority: priorities[Math.floor(Math.random() * priorities.length)],
  🚨 Line 412 [CRITICAL]: math_random
     Code: priority: priorities[Math.floor(Math.random() * priorities.length)],
  🚨 Line 413 [CRITICAL]: math_random
     Code: metadata: { progress: Math.floor(Math.random() * 100) }
  🚨 Line 413 [CRITICAL]: math_random
     Code: metadata: { progress: Math.floor(Math.random() * 100) }

📁 frontend/src/components/BulletproofAgentDashboard.tsx
  🚨 Line 61 [CRITICAL]: math_random
     Code: id: safeString(agent.id, `agent-${Date.now()}-${Math.random()}`),

📁 frontend/src/components/BulletproofAgentProfile.tsx
  🚨 Line 325 [CRITICAL]: math_random
     Code: type: ['task_completed', 'error_occurred', 'configuration_changed', 'status_changed'][Math.floor(Math.random() * 4)] as any,
  🚨 Line 325 [CRITICAL]: math_random
     Code: type: ['task_completed', 'error_occurred', 'configuration_changed', 'status_changed'][Math.floor(Math.random() * 4)] as any,
  🚨 Line 334 [CRITICAL]: math_random
     Code: ][Math.floor(Math.random() * 7)],
  🚨 Line 334 [CRITICAL]: math_random
     Code: ][Math.floor(Math.random() * 7)],
  🚨 Line 335 [CRITICAL]: math_random
     Code: duration: Math.floor(Math.random() * 300) + 10,
  🚨 Line 335 [CRITICAL]: math_random
     Code: duration: Math.floor(Math.random() * 300) + 10,
  🚨 Line 336 [CRITICAL]: math_random
     Code: success: Math.random() > 0.1,
  🚨 Line 338 [CRITICAL]: math_random
     Code: task_type: ['review', 'analysis', 'coordination'][Math.floor(Math.random() * 3)],
  🚨 Line 338 [CRITICAL]: math_random
     Code: task_type: ['review', 'analysis', 'coordination'][Math.floor(Math.random() * 3)],
  🚨 Line 339 [CRITICAL]: math_random
     Code: complexity: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)]
  🚨 Line 339 [CRITICAL]: math_random
     Code: complexity: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)]

📁 frontend/src/components/BulletproofClaudeCodePanel.tsx
  🚨 Line 237 [CRITICAL]: math_random
     Code: const created = new Date(Date.now() - Math.random() * 86400000 * 7);
  🚨 Line 239 [CRITICAL]: math_random
     Code: id: `session-${Math.random().toString(36).substr(2, 9)}`,
  🚨 Line 240 [CRITICAL]: math_random
     Code: user_id: `user-${Math.random().toString(36).substr(2, 6)}`,
  🚨 Line 241 [CRITICAL]: math_random
     Code: status: statuses[Math.floor(Math.random() * statuses.length)],
  🚨 Line 241 [CRITICAL]: math_random
     Code: status: statuses[Math.floor(Math.random() * statuses.length)],
  🚨 Line 243 [CRITICAL]: math_random
     Code: updated_at: new Date(created.getTime() + Math.random() * 3600000).toISOString(),
  🚨 Line 245 [CRITICAL]: math_random
     Code: last_activity: new Date(Date.now() - Math.random() * 3600000).toISOString(),
  🚨 Line 246 [CRITICAL]: math_random
     Code: tools_used: ['Read', 'Write', 'Bash', 'Edit'].slice(0, Math.floor(Math.random() * 4) + 1),
  🚨 Line 246 [CRITICAL]: math_random
     Code: tools_used: ['Read', 'Write', 'Bash', 'Edit'].slice(0, Math.floor(Math.random() * 4) + 1),
  🚨 Line 247 [CRITICAL]: math_random
     Code: tokens_consumed: Math.floor(Math.random() * 50000) + 1000,
  🚨 Line 247 [CRITICAL]: math_random
     Code: tokens_consumed: Math.floor(Math.random() * 50000) + 1000,
  🚨 Line 248 [CRITICAL]: math_random
     Code: api_calls: Math.floor(Math.random() * 200) + 10,
  🚨 Line 248 [CRITICAL]: math_random
     Code: api_calls: Math.floor(Math.random() * 200) + 10,
  🚨 Line 249 [CRITICAL]: math_random
     Code: success_rate: 0.8 + Math.random() * 0.2,
  🚨 Line 250 [CRITICAL]: math_random
     Code: session_duration: Math.floor(Math.random() * 7200) + 300
  🚨 Line 250 [CRITICAL]: math_random
     Code: session_duration: Math.floor(Math.random() * 7200) + 300
  🚨 Line 278 [CRITICAL]: math_random
     Code: usage_count: Math.floor(Math.random() * 1000) + 50,
  🚨 Line 278 [CRITICAL]: math_random
     Code: usage_count: Math.floor(Math.random() * 1000) + 50,
  🚨 Line 279 [CRITICAL]: math_random
     Code: success_rate: 0.85 + Math.random() * 0.15,
  🚨 Line 280 [CRITICAL]: math_random
     Code: avg_response_time: Math.floor(Math.random() * 2000) + 100,
  🚨 Line 280 [CRITICAL]: math_random
     Code: avg_response_time: Math.floor(Math.random() * 2000) + 100,
  🚨 Line 281 [CRITICAL]: math_random
     Code: last_used: new Date(Date.now() - Math.random() * 86400000).toISOString(),
  🚨 Line 282 [CRITICAL]: math_random
     Code: error_count: Math.floor(Math.random() * 10)
  🚨 Line 282 [CRITICAL]: math_random
     Code: error_count: Math.floor(Math.random() * 10)

📁 frontend/src/components/BulletproofSettings.tsx
  🚨 Line 447 [CRITICAL]: math_random
     Code: result += chars.charAt(Math.floor(Math.random() * chars.length));
  🚨 Line 447 [CRITICAL]: math_random
     Code: result += chars.charAt(Math.floor(Math.random() * chars.length));

📁 frontend/src/components/BulletproofSocialMediaFeed.tsx
  🚨 Line 72 [CRITICAL]: math_random
     Code: id: safeString(post.id, `fallback-${Date.now()}${Math.random()}`),
  🚨 Line 209 [CRITICAL]: math_random
     Code: comments: safeNumber(post.comments, Math.floor(Math.random() * 8)),
  🚨 Line 209 [CRITICAL]: math_random
     Code: comments: safeNumber(post.comments, Math.floor(Math.random() * 8)),
  🚨 Line 210 [CRITICAL]: math_random
     Code: shares: safeNumber(post.shares, Math.floor(Math.random() * 5))
  🚨 Line 210 [CRITICAL]: math_random
     Code: shares: safeNumber(post.shares, Math.floor(Math.random() * 5))

📁 frontend/src/components/BulletproofSystemAnalytics.tsx
  🚨 Line 885 [CRITICAL]: math_random
     Code: cpu_usage: Math.floor(Math.random() * 40) + 30,
  🚨 Line 885 [CRITICAL]: math_random
     Code: cpu_usage: Math.floor(Math.random() * 40) + 30,
  🚨 Line 886 [CRITICAL]: math_random
     Code: memory_usage: Math.floor(Math.random() * 30) + 50,
  🚨 Line 886 [CRITICAL]: math_random
     Code: memory_usage: Math.floor(Math.random() * 30) + 50,
  🚨 Line 887 [CRITICAL]: math_random
     Code: network_io: Math.floor(Math.random() * 50) + 20,
  🚨 Line 887 [CRITICAL]: math_random
     Code: network_io: Math.floor(Math.random() * 50) + 20,
  🚨 Line 888 [CRITICAL]: math_random
     Code: disk_io: Math.floor(Math.random() * 20) + 10,
  🚨 Line 888 [CRITICAL]: math_random
     Code: disk_io: Math.floor(Math.random() * 20) + 10,
  🚨 Line 889 [CRITICAL]: math_random
     Code: active_agents: Math.floor(Math.random() * 5) + 12,
  🚨 Line 889 [CRITICAL]: math_random
     Code: active_agents: Math.floor(Math.random() * 5) + 12,
  🚨 Line 890 [CRITICAL]: math_random
     Code: response_time: Math.floor(Math.random() * 500) + 800,
  🚨 Line 890 [CRITICAL]: math_random
     Code: response_time: Math.floor(Math.random() * 500) + 800,
  🚨 Line 891 [CRITICAL]: math_random
     Code: throughput: Math.floor(Math.random() * 100) + 150,
  🚨 Line 891 [CRITICAL]: math_random
     Code: throughput: Math.floor(Math.random() * 100) + 150,
  🚨 Line 892 [CRITICAL]: math_random
     Code: error_rate: Math.random() * 2
  🚨 Line 921 [CRITICAL]: math_random
     Code: cpu_usage: Math.floor(Math.random() * 60) + 20,
  🚨 Line 921 [CRITICAL]: math_random
     Code: cpu_usage: Math.floor(Math.random() * 60) + 20,
  🚨 Line 922 [CRITICAL]: math_random
     Code: memory_usage: Math.floor(Math.random() * 50) + 30,
  🚨 Line 922 [CRITICAL]: math_random
     Code: memory_usage: Math.floor(Math.random() * 50) + 30,
  🚨 Line 923 [CRITICAL]: math_random
     Code: response_time: Math.floor(Math.random() * 1000) + 500,
  🚨 Line 923 [CRITICAL]: math_random
     Code: response_time: Math.floor(Math.random() * 1000) + 500,
  🚨 Line 924 [CRITICAL]: math_random
     Code: success_rate: 0.85 + Math.random() * 0.15,
  🚨 Line 925 [CRITICAL]: math_random
     Code: tasks_completed: Math.floor(Math.random() * 200) + 50,
  🚨 Line 925 [CRITICAL]: math_random
     Code: tasks_completed: Math.floor(Math.random() * 200) + 50,
  🚨 Line 926 [CRITICAL]: math_random
     Code: tokens_used: Math.floor(Math.random() * 50000) + 10000,
  🚨 Line 926 [CRITICAL]: math_random
     Code: tokens_used: Math.floor(Math.random() * 50000) + 10000,
  🚨 Line 927 [CRITICAL]: math_random
     Code: uptime: 95 + Math.random() * 5,
  🚨 Line 928 [CRITICAL]: math_random
     Code: last_activity: new Date(Date.now() - Math.random() * 3600000).toISOString()

📁 frontend/src/components/DynamicPageRenderer.tsx
  🚨 Line 82 [CRITICAL]: math_random
     Code: <div key={Math.random()} className={`bg-white rounded-lg border border-gray-200 p-4 ${props.className || ''}`}>
  🚨 Line 91 [CRITICAL]: math_random
     Code: <div key={Math.random()} className={`grid grid-cols-${props.cols || 1} gap-${props.gap || 4}`}>
  🚨 Line 104 [CRITICAL]: math_random
     Code: <span key={Math.random()} className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${variants[props.variant] || variants.default}`}>
  🚨 Line 111 [CRITICAL]: math_random
     Code: <div key={Math.random()} className="text-center">
  🚨 Line 120 [CRITICAL]: math_random
     Code: <div key={Math.random()} className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
  🚨 Line 145 [CRITICAL]: math_random
     Code: <div key={Math.random()} className="bg-white rounded-lg border border-gray-200 p-4">
  🚨 Line 166 [CRITICAL]: math_random
     Code: <button key={Math.random()} className={`inline-flex items-center px-4 py-2 rounded-md font-medium ${buttonVariants[props.variant] || buttonVariants.default} ${props.className || ''}`}>
  🚨 Line 174 [CRITICAL]: math_random
     Code: <div key={Math.random()} className="p-2 border border-gray-200 rounded">

📁 frontend/src/components/EnhancedLinkPreview.tsx
  🚨 Line 230 [CRITICAL]: math_random
     Code: readingTime = Math.floor(Math.random() * 10) + 3; // Estimated reading time
  🚨 Line 230 [CRITICAL]: math_random
     Code: readingTime = Math.floor(Math.random() * 10) + 3; // Estimated reading time

📁 frontend/src/components/ErrorBoundary.tsx
  🚨 Line 281 [CRITICAL]: math_random
     Code: const errorId = `legacy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

📁 frontend/src/components/GlobalErrorBoundary.tsx
  🚨 Line 38 [CRITICAL]: math_random
     Code: errorId: Date.now().toString(36) + Math.random().toString(36).substr(2, 5)

📁 frontend/src/components/PerformanceTestSuite.tsx
  🚨 Line 121 [CRITICAL]: math_random
     Code: apiLatency: Math.random() * 200, // Simulated

📁 frontend/src/components/RealTimeActivityFeed.tsx
  🚨 Line 33 [CRITICAL]: math_random
     Code: id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,

📁 frontend/src/components/RobustWebSocketProvider.tsx
  🚨 Line 183 [CRITICAL]: math_random
     Code: id: `${Date.now()}-${Math.random()}`,

📁 frontend/src/components/SystemAnalytics.tsx
  🚨 Line 474 [CRITICAL]: math_random
     Code: cpu_usage: Math.floor(Math.random() * 40) + 30,
  🚨 Line 474 [CRITICAL]: math_random
     Code: cpu_usage: Math.floor(Math.random() * 40) + 30,
  🚨 Line 475 [CRITICAL]: math_random
     Code: memory_usage: Math.floor(Math.random() * 30) + 50,
  🚨 Line 475 [CRITICAL]: math_random
     Code: memory_usage: Math.floor(Math.random() * 30) + 50,
  🚨 Line 476 [CRITICAL]: math_random
     Code: network_io: Math.floor(Math.random() * 50) + 20,
  🚨 Line 476 [CRITICAL]: math_random
     Code: network_io: Math.floor(Math.random() * 50) + 20,
  🚨 Line 477 [CRITICAL]: math_random
     Code: disk_io: Math.floor(Math.random() * 20) + 10,
  🚨 Line 477 [CRITICAL]: math_random
     Code: disk_io: Math.floor(Math.random() * 20) + 10,
  🚨 Line 478 [CRITICAL]: math_random
     Code: active_agents: Math.floor(Math.random() * 5) + 12,
  🚨 Line 478 [CRITICAL]: math_random
     Code: active_agents: Math.floor(Math.random() * 5) + 12,
  🚨 Line 479 [CRITICAL]: math_random
     Code: response_time: Math.floor(Math.random() * 500) + 800,
  🚨 Line 479 [CRITICAL]: math_random
     Code: response_time: Math.floor(Math.random() * 500) + 800,
  🚨 Line 480 [CRITICAL]: math_random
     Code: throughput: Math.floor(Math.random() * 100) + 150,
  🚨 Line 480 [CRITICAL]: math_random
     Code: throughput: Math.floor(Math.random() * 100) + 150,
  🚨 Line 481 [CRITICAL]: math_random
     Code: error_rate: Math.random() * 2
  🚨 Line 502 [CRITICAL]: math_random
     Code: cpu_usage: Math.floor(Math.random() * 60) + 20,
  🚨 Line 502 [CRITICAL]: math_random
     Code: cpu_usage: Math.floor(Math.random() * 60) + 20,
  🚨 Line 503 [CRITICAL]: math_random
     Code: memory_usage: Math.floor(Math.random() * 50) + 30,
  🚨 Line 503 [CRITICAL]: math_random
     Code: memory_usage: Math.floor(Math.random() * 50) + 30,
  🚨 Line 504 [CRITICAL]: math_random
     Code: response_time: Math.floor(Math.random() * 1000) + 500,
  🚨 Line 504 [CRITICAL]: math_random
     Code: response_time: Math.floor(Math.random() * 1000) + 500,
  🚨 Line 505 [CRITICAL]: math_random
     Code: success_rate: 0.85 + Math.random() * 0.15,
  🚨 Line 506 [CRITICAL]: math_random
     Code: tasks_completed: Math.floor(Math.random() * 200) + 50,
  🚨 Line 506 [CRITICAL]: math_random
     Code: tasks_completed: Math.floor(Math.random() * 200) + 50,
  🚨 Line 507 [CRITICAL]: math_random
     Code: tokens_used: Math.floor(Math.random() * 50000) + 10000,
  🚨 Line 507 [CRITICAL]: math_random
     Code: tokens_used: Math.floor(Math.random() * 50000) + 10000,
  🚨 Line 508 [CRITICAL]: math_random
     Code: uptime: 95 + Math.random() * 5,
  🚨 Line 509 [CRITICAL]: math_random
     Code: last_activity: new Date(Date.now() - Math.random() * 3600000).toISOString()

📁 frontend/src/components/TerminalDebugTest.tsx
  🚨 Line 46 [CRITICAL]: math_random
     Code: pid: Math.floor(Math.random() * 100000)
  🚨 Line 46 [CRITICAL]: math_random
     Code: pid: Math.floor(Math.random() * 100000)

📁 frontend/src/components/ThumbnailSummaryContainer.tsx
  🚨 Line 150 [CRITICAL]: math_random
     Code: fallbacks.push(`https://picsum.photos/320/180?random=${Math.floor(Math.random() * 1000)}`);
  🚨 Line 150 [CRITICAL]: math_random
     Code: fallbacks.push(`https://picsum.photos/320/180?random=${Math.floor(Math.random() * 1000)}`);

📁 frontend/src/components/TokenAnalyticsTest.tsx
  🚨 Line 16 [CRITICAL]: math_random
     Code: data: Array.from({ length: 24 }, () => Math.floor(Math.random() * 5000) + 1000),
  🚨 Line 16 [CRITICAL]: math_random
     Code: data: Array.from({ length: 24 }, () => Math.floor(Math.random() * 5000) + 1000),
  🚨 Line 23 [CRITICAL]: math_random
     Code: data: Array.from({ length: 24 }, () => Math.floor(Math.random() * 50) + 10),
  🚨 Line 23 [CRITICAL]: math_random
     Code: data: Array.from({ length: 24 }, () => Math.floor(Math.random() * 50) + 10),
  🚨 Line 37 [CRITICAL]: math_random
     Code: data: Array.from({ length: 30 }, () => Math.floor(Math.random() * 50000) + 10000),
  🚨 Line 37 [CRITICAL]: math_random
     Code: data: Array.from({ length: 30 }, () => Math.floor(Math.random() * 50000) + 10000),
  🚨 Line 49 [CRITICAL]: math_random
     Code: total_tokens: Math.floor(Math.random() * 2000) + 500,
  🚨 Line 49 [CRITICAL]: math_random
     Code: total_tokens: Math.floor(Math.random() * 2000) + 500,
  🚨 Line 50 [CRITICAL]: math_random
     Code: cost_total: Math.floor(Math.random() * 100) + 20, // cents
  🚨 Line 50 [CRITICAL]: math_random
     Code: cost_total: Math.floor(Math.random() * 100) + 20, // cents
  🚨 Line 51 [CRITICAL]: math_random
     Code: processing_time_ms: Math.floor(Math.random() * 3000) + 500,
  🚨 Line 51 [CRITICAL]: math_random
     Code: processing_time_ms: Math.floor(Math.random() * 3000) + 500,

📁 frontend/src/components/agent-customization/ThemeCustomizer.tsx
  🚨 Line 178 [CRITICAL]: math_random
     Code: const hue = Math.floor(Math.random() * 360);
  🚨 Line 178 [CRITICAL]: math_random
     Code: const hue = Math.floor(Math.random() * 360);

📁 frontend/src/components/agent-customization/WidgetConfiguration.tsx
  🚨 Line 365 [CRITICAL]: math_random
     Code: id: `${template.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  🚨 Line 427 [CRITICAL]: math_random
     Code: <div key={i} className="w-2 bg-blue-200 rounded" style={{ height: `${10 + Math.random() * 20}px` }}></div>

📁 frontend/src/components/analytics/CostOverviewDashboard.tsx
  🚨 Line 101 [CRITICAL]: math_random
     Code: const baseValue = 0.5 + Math.random() * 2;

📁 frontend/src/components/analytics/MessageStepAnalytics.tsx
  🚨 Line 81 [CRITICAL]: math_random
     Code: const baseValue = 45 + Math.random() * 30;
  🚨 Line 101 [CRITICAL]: math_random
     Code: const baseValue = 120 + Math.random() * 80;
  🚨 Line 121 [CRITICAL]: math_random
     Code: const baseValue = 1200 + Math.random() * 600;
  🚨 Line 122 [CRITICAL]: math_random
     Code: const spike = Math.random() > 0.9 ? 1000 : 0; // Occasional spikes

📁 frontend/src/components/avi-integration/AviChatInterface.tsx
  🚨 Line 187 [CRITICAL]: math_random
     Code: id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,

📁 frontend/src/components/claude-instances/ClaudeInstanceManagementDemo.tsx
  🚨 Line 28 [CRITICAL]: math_random
     Code: pid: status === 'running' ? Math.floor(Math.random() * 10000) + 1000 : undefined,
  🚨 Line 28 [CRITICAL]: math_random
     Code: pid: status === 'running' ? Math.floor(Math.random() * 10000) + 1000 : undefined,
  🚨 Line 29 [CRITICAL]: math_random
     Code: startTime: status === 'running' ? new Date(Date.now() - Math.random() * 3600000) : undefined,
  🚨 Line 30 [CRITICAL]: math_random
     Code: lastActivity: status === 'running' ? new Date(Date.now() - Math.random() * 300000) : undefined,
  🚨 Line 31 [CRITICAL]: math_random
     Code: uptime: status === 'running' ? Math.floor(Math.random() * 7200) : undefined,
  🚨 Line 31 [CRITICAL]: math_random
     Code: uptime: status === 'running' ? Math.floor(Math.random() * 7200) : undefined,
  🚨 Line 32 [CRITICAL]: math_random
     Code: cpuUsage: status === 'running' ? Math.random() * 100 : undefined,
  🚨 Line 33 [CRITICAL]: math_random
     Code: memoryUsage: status === 'running' ? Math.random() * 1024 * 1024 * 1024 : undefined,
  🚨 Line 36 [CRITICAL]: math_random
     Code: createdAt: new Date(Date.now() - Math.random() * 86400000),
  🚨 Line 43 [CRITICAL]: math_random
     Code: connectionCount: status === 'running' ? Math.floor(Math.random() * 3) + 1 : 0
  🚨 Line 43 [CRITICAL]: math_random
     Code: connectionCount: status === 'running' ? Math.floor(Math.random() * 3) + 1 : 0
  🚨 Line 154 [CRITICAL]: math_random
     Code: tokensUsed: Math.floor(Math.random() * 100) + 50,
  🚨 Line 154 [CRITICAL]: math_random
     Code: tokensUsed: Math.floor(Math.random() * 100) + 50,
  🚨 Line 156 [CRITICAL]: math_random
     Code: duration: Math.floor(Math.random() * 2000) + 500
  🚨 Line 156 [CRITICAL]: math_random
     Code: duration: Math.floor(Math.random() * 2000) + 500
  🚨 Line 162 [CRITICAL]: math_random
     Code: }, 1000 + Math.random() * 2000);

📁 frontend/src/components/posting-interface/AviDMSection.tsx
  🚨 Line 207 [CRITICAL]: math_random
     Code: }, 2000 + Math.random() * 3000);

📁 frontend/src/components/posting-interface/AviDirectChatReal.tsx
  🚨 Line 158 [CRITICAL]: math_random
     Code: const jitter = exponentialDelay * finalRetryConfig.jitterFactor * Math.random();
  🚨 Line 201 [CRITICAL]: math_random
     Code: id: `claude-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  🚨 Line 446 [CRITICAL]: math_random
     Code: id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,

📁 frontend/src/context/WebSocketSingletonContext.tsx
  🚨 Line 198 [CRITICAL]: math_random
     Code: id: `${Date.now()}-${Math.random()}`,

📁 frontend/src/hooks/useAnalytics.ts
  🚨 Line 70 [CRITICAL]: math_random
     Code: totalTokens: 2847392 + Math.floor(Math.random() * 100000),
  🚨 Line 70 [CRITICAL]: math_random
     Code: totalTokens: 2847392 + Math.floor(Math.random() * 100000),
  🚨 Line 71 [CRITICAL]: math_random
     Code: inputTokens: 1698234 + Math.floor(Math.random() * 50000),
  🚨 Line 71 [CRITICAL]: math_random
     Code: inputTokens: 1698234 + Math.floor(Math.random() * 50000),
  🚨 Line 72 [CRITICAL]: math_random
     Code: outputTokens: 1149158 + Math.floor(Math.random() * 50000),
  🚨 Line 72 [CRITICAL]: math_random
     Code: outputTokens: 1149158 + Math.floor(Math.random() * 50000),
  🚨 Line 73 [CRITICAL]: math_random
     Code: tokensPerHour: 12453 + Math.floor(Math.random() * 2000),
  🚨 Line 73 [CRITICAL]: math_random
     Code: tokensPerHour: 12453 + Math.floor(Math.random() * 2000),
  🚨 Line 74 [CRITICAL]: math_random
     Code: tokensPerDay: 298872 + Math.floor(Math.random() * 50000),
  🚨 Line 74 [CRITICAL]: math_random
     Code: tokensPerDay: 298872 + Math.floor(Math.random() * 50000),
  🚨 Line 75 [CRITICAL]: math_random
     Code: averageTokensPerRequest: 1247 + Math.floor(Math.random() * 200),
  🚨 Line 75 [CRITICAL]: math_random
     Code: averageTokensPerRequest: 1247 + Math.floor(Math.random() * 200),
  🚨 Line 76 [CRITICAL]: math_random
     Code: tokenEfficiency: 0.87 + Math.random() * 0.1
  🚨 Line 80 [CRITICAL]: math_random
     Code: totalMessages: 1247 + Math.floor(Math.random() * 100),
  🚨 Line 80 [CRITICAL]: math_random
     Code: totalMessages: 1247 + Math.floor(Math.random() * 100),
  🚨 Line 81 [CRITICAL]: math_random
     Code: successfulMessages: 1198 + Math.floor(Math.random() * 50),
  🚨 Line 81 [CRITICAL]: math_random
     Code: successfulMessages: 1198 + Math.floor(Math.random() * 50),
  🚨 Line 82 [CRITICAL]: math_random
     Code: failedMessages: 49 + Math.floor(Math.random() * 10),
  🚨 Line 82 [CRITICAL]: math_random
     Code: failedMessages: 49 + Math.floor(Math.random() * 10),
  🚨 Line 83 [CRITICAL]: math_random
     Code: averageResponseTime: 1234 + Math.floor(Math.random() * 500),
  🚨 Line 83 [CRITICAL]: math_random
     Code: averageResponseTime: 1234 + Math.floor(Math.random() * 500),
  🚨 Line 85 [CRITICAL]: math_random
     Code: 'text-generation': 567 + Math.floor(Math.random() * 100),
  🚨 Line 85 [CRITICAL]: math_random
     Code: 'text-generation': 567 + Math.floor(Math.random() * 100),
  🚨 Line 86 [CRITICAL]: math_random
     Code: 'code-analysis': 234 + Math.floor(Math.random() * 50),
  🚨 Line 86 [CRITICAL]: math_random
     Code: 'code-analysis': 234 + Math.floor(Math.random() * 50),
  🚨 Line 87 [CRITICAL]: math_random
     Code: 'data-processing': 189 + Math.floor(Math.random() * 30),
  🚨 Line 87 [CRITICAL]: math_random
     Code: 'data-processing': 189 + Math.floor(Math.random() * 30),
  🚨 Line 88 [CRITICAL]: math_random
     Code: 'image-generation': 123 + Math.floor(Math.random() * 20),
  🚨 Line 88 [CRITICAL]: math_random
     Code: 'image-generation': 123 + Math.floor(Math.random() * 20),
  🚨 Line 89 [CRITICAL]: math_random
     Code: 'document-parsing': 89 + Math.floor(Math.random() * 15),
  🚨 Line 89 [CRITICAL]: math_random
     Code: 'document-parsing': 89 + Math.floor(Math.random() * 15),
  🚨 Line 90 [CRITICAL]: math_random
     Code: 'other': 45 + Math.floor(Math.random() * 10)
  🚨 Line 90 [CRITICAL]: math_random
     Code: 'other': 45 + Math.floor(Math.random() * 10)
  🚨 Line 92 [CRITICAL]: math_random
     Code: errorRate: 0.039 + Math.random() * 0.01
  🚨 Line 96 [CRITICAL]: math_random
     Code: totalSteps: 3456 + Math.floor(Math.random() * 500),
  🚨 Line 96 [CRITICAL]: math_random
     Code: totalSteps: 3456 + Math.floor(Math.random() * 500),
  🚨 Line 97 [CRITICAL]: math_random
     Code: completedSteps: 3298 + Math.floor(Math.random() * 400),
  🚨 Line 97 [CRITICAL]: math_random
     Code: completedSteps: 3298 + Math.floor(Math.random() * 400),
  🚨 Line 98 [CRITICAL]: math_random
     Code: failedSteps: 158 + Math.floor(Math.random() * 50),
  🚨 Line 98 [CRITICAL]: math_random
     Code: failedSteps: 158 + Math.floor(Math.random() * 50),
  🚨 Line 99 [CRITICAL]: math_random
     Code: averageStepDuration: 2340 + Math.floor(Math.random() * 500),
  🚨 Line 99 [CRITICAL]: math_random
     Code: averageStepDuration: 2340 + Math.floor(Math.random() * 500),
  🚨 Line 101 [CRITICAL]: math_random
     Code: 'prompt-generation': 1234 + Math.floor(Math.random() * 200),
  🚨 Line 101 [CRITICAL]: math_random
     Code: 'prompt-generation': 1234 + Math.floor(Math.random() * 200),
  🚨 Line 102 [CRITICAL]: math_random
     Code: 'api-call': 987 + Math.floor(Math.random() * 150),
  🚨 Line 102 [CRITICAL]: math_random
     Code: 'api-call': 987 + Math.floor(Math.random() * 150),
  🚨 Line 103 [CRITICAL]: math_random
     Code: 'response-parsing': 654 + Math.floor(Math.random() * 100),
  🚨 Line 103 [CRITICAL]: math_random
     Code: 'response-parsing': 654 + Math.floor(Math.random() * 100),
  🚨 Line 104 [CRITICAL]: math_random
     Code: 'data-validation': 321 + Math.floor(Math.random() * 50),
  🚨 Line 104 [CRITICAL]: math_random
     Code: 'data-validation': 321 + Math.floor(Math.random() * 50),
  🚨 Line 105 [CRITICAL]: math_random
     Code: 'error-handling': 158 + Math.floor(Math.random() * 30),
  🚨 Line 105 [CRITICAL]: math_random
     Code: 'error-handling': 158 + Math.floor(Math.random() * 30),
  🚨 Line 106 [CRITICAL]: math_random
     Code: 'caching': 102 + Math.floor(Math.random() * 20)
  🚨 Line 106 [CRITICAL]: math_random
     Code: 'caching': 102 + Math.floor(Math.random() * 20)
  🚨 Line 108 [CRITICAL]: math_random
     Code: stepSuccessRate: 0.954 + Math.random() * 0.03
  🚨 Line 114 [CRITICAL]: math_random
     Code: requestCount: 1247 + Math.floor(Math.random() * 200),
  🚨 Line 114 [CRITICAL]: math_random
     Code: requestCount: 1247 + Math.floor(Math.random() * 200),
  🚨 Line 115 [CRITICAL]: math_random
     Code: tokenUsage: 847392 + Math.floor(Math.random() * 100000),
  🚨 Line 115 [CRITICAL]: math_random
     Code: tokenUsage: 847392 + Math.floor(Math.random() * 100000),
  🚨 Line 116 [CRITICAL]: math_random
     Code: cost: 45.67 + Math.random() * 10,
  🚨 Line 117 [CRITICAL]: math_random
     Code: percentage: 29.1 + Math.random() * 5,
  🚨 Line 118 [CRITICAL]: math_random
     Code: responseTime: 234 + Math.floor(Math.random() * 50)
  🚨 Line 118 [CRITICAL]: math_random
     Code: responseTime: 234 + Math.floor(Math.random() * 50)
  🚨 Line 122 [CRITICAL]: math_random
     Code: requestCount: 856 + Math.floor(Math.random() * 150),
  🚨 Line 122 [CRITICAL]: math_random
     Code: requestCount: 856 + Math.floor(Math.random() * 150),
  🚨 Line 123 [CRITICAL]: math_random
     Code: tokenUsage: 1294857 + Math.floor(Math.random() * 150000),
  🚨 Line 123 [CRITICAL]: math_random
     Code: tokenUsage: 1294857 + Math.floor(Math.random() * 150000),
  🚨 Line 124 [CRITICAL]: math_random
     Code: cost: 78.45 + Math.random() * 15,
  🚨 Line 125 [CRITICAL]: math_random
     Code: percentage: 50.0 + Math.random() * 5,
  🚨 Line 126 [CRITICAL]: math_random
     Code: responseTime: 156 + Math.floor(Math.random() * 30)
  🚨 Line 126 [CRITICAL]: math_random
     Code: responseTime: 156 + Math.floor(Math.random() * 30)
  🚨 Line 130 [CRITICAL]: math_random
     Code: requestCount: 423 + Math.floor(Math.random() * 100),
  🚨 Line 130 [CRITICAL]: math_random
     Code: requestCount: 423 + Math.floor(Math.random() * 100),
  🚨 Line 131 [CRITICAL]: math_random
     Code: tokenUsage: 705143 + Math.floor(Math.random() * 80000),
  🚨 Line 131 [CRITICAL]: math_random
     Code: tokenUsage: 705143 + Math.floor(Math.random() * 80000),
  🚨 Line 132 [CRITICAL]: math_random
     Code: cost: 32.66 + Math.random() * 8,
  🚨 Line 133 [CRITICAL]: math_random
     Code: percentage: 20.9 + Math.random() * 3,
  🚨 Line 134 [CRITICAL]: math_random
     Code: responseTime: 89 + Math.floor(Math.random() * 20)
  🚨 Line 134 [CRITICAL]: math_random
     Code: responseTime: 89 + Math.floor(Math.random() * 20)
  🚨 Line 138 [CRITICAL]: math_random
     Code: const mockBudgetAlerts: BudgetAlert[] = Math.random() > 0.7 ? [
  🚨 Line 142 [CRITICAL]: math_random
     Code: message: `Daily budget at ${(78 + Math.random() * 15).toFixed(0)}% - approaching limit`,
  🚨 Line 144 [CRITICAL]: math_random
     Code: currentValue: 78 + Math.random() * 15,
  🚨 Line 207 [CRITICAL]: math_random
     Code: totalCost: prev.totalCost + Math.random() * 0.1 - 0.05,

📁 frontend/src/hooks/useDualModeMessages.ts
  🚨 Line 189 [CRITICAL]: math_random
     Code: id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,

📁 frontend/src/hooks/useHTTPSSE.ts
  🚨 Line 71 [CRITICAL]: math_random
     Code: const withJitter = exponential + Math.random() * 1000;

📁 frontend/src/hooks/useImageUpload.ts
  🚨 Line 90 [CRITICAL]: math_random
     Code: progress += Math.random() * 15;
  🚨 Line 109 [CRITICAL]: math_random
     Code: }, 1000 + Math.random() * 2000); // 1-3 seconds upload time

📁 frontend/src/hooks/useInstanceManager.ts
  🚨 Line 173 [CRITICAL]: math_random
     Code: pid: Math.floor(Math.random() * 90000) + 10000,
  🚨 Line 173 [CRITICAL]: math_random
     Code: pid: Math.floor(Math.random() * 90000) + 10000,

📁 frontend/src/hooks/usePerformanceMonitor.ts
  🚨 Line 120 [CRITICAL]: math_random
     Code: id: `${metric}-${Date.now()}-${Math.random()}`,

📁 frontend/src/hooks/useReactBatchingAnalyzer.ts
  🚨 Line 74 [CRITICAL]: math_random
     Code: const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

📁 frontend/src/hooks/useResourceLeakPrevention.ts
  🚨 Line 359 [CRITICAL]: math_random
     Code: const subscriptionId = `subscription_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

📁 frontend/src/hooks/useSSEClaudeInstance.ts
  🚨 Line 102 [CRITICAL]: math_random
     Code: id: `output-${Date.now()}-${Math.random()}`,

📁 frontend/src/hooks/useSSEClaudeManager.ts
  🚨 Line 145 [CRITICAL]: math_random
     Code: id: `output-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  🚨 Line 159 [CRITICAL]: math_random
     Code: id: `input-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,

📁 frontend/src/hooks/useTokenCostTracking.ts
  🚨 Line 129 [CRITICAL]: math_random
     Code: id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,

📁 frontend/src/repositories/PostRepository.ts
  🚨 Line 162 [CRITICAL]: math_random
     Code: const postId = `post-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

📁 frontend/src/services/AgentDataService.ts
  🚨 Line 381 [CRITICAL]: math_random
     Code: return `page-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

📁 frontend/src/services/AviConfigurationManager.ts
  🚨 Line 176 [CRITICAL]: math_random
     Code: id: `avi-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,

📁 frontend/src/services/AviConnectionManager.ts
  🚨 Line 193 [CRITICAL]: math_random
     Code: const jitter = exponentialDelay * this.config.jitterFactor * Math.random();

📁 frontend/src/services/AviDMService.ts
  🚨 Line 736 [CRITICAL]: math_random
     Code: return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  🚨 Line 740 [CRITICAL]: math_random
     Code: return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

📁 frontend/src/services/AviHealthMonitor.ts
  🚨 Line 547 [CRITICAL]: math_random
     Code: throughput: Math.random() * 1000 // Simulated throughput
  🚨 Line 640 [CRITICAL]: math_random
     Code: return this.performanceProfile.averageLatency + Math.random() * 100;
  🚨 Line 648 [CRITICAL]: math_random
     Code: return Math.random() * 0.8; // Simulated memory usage

📁 frontend/src/services/AviInstanceManager.ts
  🚨 Line 381 [CRITICAL]: math_random
     Code: id: `avi-msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  🚨 Line 456 [CRITICAL]: math_random
     Code: id: `avi-img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,

📁 frontend/src/services/AviPersonality.ts
  🚨 Line 1438 [CRITICAL]: math_random
     Code: return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

📁 frontend/src/services/ClaudeServiceManager.ts
  🚨 Line 112 [CRITICAL]: math_random
     Code: const instanceId = `claude-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

📁 frontend/src/services/DatabaseService.ts
  🚨 Line 240 [CRITICAL]: math_random
     Code: systemLoad: Math.random() * 100 // This should come from actual system monitoring
  🚨 Line 258 [CRITICAL]: math_random
     Code: status: ['active', 'idle', 'busy'][Math.floor(Math.random() * 3)],
  🚨 Line 258 [CRITICAL]: math_random
     Code: status: ['active', 'idle', 'busy'][Math.floor(Math.random() * 3)],

📁 frontend/src/services/DraftService.ts
  🚨 Line 69 [CRITICAL]: math_random
     Code: return Date.now().toString(36) + Math.random().toString(36).substr(2);

📁 frontend/src/services/ExponentialBackoffManager.ts
  🚨 Line 42 [CRITICAL]: math_random
     Code: delay = delay * (0.5 + Math.random() * 0.5);

📁 frontend/src/services/IncrementalMessageProcessor.ts
  🚨 Line 255 [CRITICAL]: math_random
     Code: id: rawMessage.id || `${Date.now()}-${Math.random()}`,

📁 frontend/src/services/PerformanceBenchmarker.ts
  🚨 Line 368 [CRITICAL]: math_random
     Code: <div class="metric-value">${Math.random() * 1000}</div>
  🚨 Line 370 [CRITICAL]: math_random
     Code: ${Array(10).fill(0).map(() => `<div class="chart-bar" style="height: ${Math.random() * 100}%"></div>`).join('')}
  🚨 Line 407 [CRITICAL]: math_random
     Code: <div class="metric-value">${Math.random() * 1000}</div>
  🚨 Line 495 [CRITICAL]: math_random
     Code: await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
  🚨 Line 508 [CRITICAL]: math_random
     Code: _fromCache: Math.random() > 0.7

📁 frontend/src/services/SSEClaudeInstanceManager.ts
  🚨 Line 167 [CRITICAL]: math_random
     Code: const commandId = `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  🚨 Line 445 [CRITICAL]: math_random
     Code: id: `output-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  🚨 Line 469 [CRITICAL]: math_random
     Code: id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  🚨 Line 491 [CRITICAL]: math_random
     Code: id: `system-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,

📁 frontend/src/services/SSEConnectionManager.ts
  🚨 Line 340 [CRITICAL]: math_random
     Code: const withJitter = exponential + Math.random() * 1000;

📁 frontend/src/services/SSEConnectionService.ts
  🚨 Line 257 [CRITICAL]: math_random
     Code: id: `msg-${Date.now()}-${Math.random()}`,

📁 frontend/src/services/TerminalRetryManager.ts
  🚨 Line 84 [CRITICAL]: math_random
     Code: const jitter = delay * jitterFactor * (Math.random() - 0.5);

📁 frontend/src/services/WebSocketManager.ts
  🚨 Line 98 [CRITICAL]: math_random
     Code: messageId: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

📁 frontend/src/services/WebSocketTerminal.ts
  🚨 Line 32 [CRITICAL]: math_random
     Code: this.sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

📁 frontend/src/services/api.ts
  🚨 Line 673 [CRITICAL]: math_random
     Code: likesCount: Math.floor(Math.random() * 10) + 1,
  🚨 Line 673 [CRITICAL]: math_random
     Code: likesCount: Math.floor(Math.random() * 10) + 1,
  🚨 Line 682 [CRITICAL]: math_random
     Code: like: Math.floor(Math.random() * 5),
  🚨 Line 682 [CRITICAL]: math_random
     Code: like: Math.floor(Math.random() * 5),
  🚨 Line 683 [CRITICAL]: math_random
     Code: heart: Math.floor(Math.random() * 3)
  🚨 Line 683 [CRITICAL]: math_random
     Code: heart: Math.floor(Math.random() * 3)
  🚨 Line 702 [CRITICAL]: math_random
     Code: likesCount: Math.floor(Math.random() * 5),
  🚨 Line 702 [CRITICAL]: math_random
     Code: likesCount: Math.floor(Math.random() * 5),
  🚨 Line 711 [CRITICAL]: math_random
     Code: like: Math.floor(Math.random() * 3)
  🚨 Line 711 [CRITICAL]: math_random
     Code: like: Math.floor(Math.random() * 3)

📁 frontend/src/services/connection/error-handler.ts
  🚨 Line 327 [CRITICAL]: math_random
     Code: return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  🚨 Line 464 [CRITICAL]: math_random
     Code: const jitter = exponentialDelay * 0.1 * Math.random();

📁 frontend/src/services/connection/health-monitor.ts
  🚨 Line 72 [CRITICAL]: math_random
     Code: id: Math.random().toString(36).substr(2, 9)

📁 frontend/src/services/connection/robust-connection-manager.ts
  🚨 Line 492 [CRITICAL]: math_random
     Code: this.emit('testConnection', { clientSent: Date.now(), testId: Math.random().toString(36) });

📁 frontend/src/services/connection/strategies.ts
  🚨 Line 64 [CRITICAL]: math_random
     Code: const jitter = (Math.random() - 0.5) * 2 * jitterRange;
  🚨 Line 209 [CRITICAL]: math_random
     Code: const jitter = (Math.random() - 0.5) * 2 * jitterRange;

📁 frontend/src/services/cost-tracking/CostTrackingService.ts
  🚨 Line 104 [CRITICAL]: math_random
     Code: id: `usage-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,

📁 frontend/src/utils/analytics-state-manager.ts
  🚨 Line 173 [CRITICAL]: mock_variable
     Code: async loadSystemMetrics(mockData?: any[]) {
  🚨 Line 187 [CRITICAL]: mock_variable
     Code: if (mockData) {
  🚨 Line 192 [CRITICAL]: mock_variable
     Code: data: mockData,
  🚨 Line 260 [CRITICAL]: mock_variable
     Code: async loadPerformanceData(mockData?: any[]) {
  🚨 Line 273 [CRITICAL]: mock_variable
     Code: if (mockData) {
  🚨 Line 278 [CRITICAL]: mock_variable
     Code: data: mockData,

📁 frontend/src/utils/errorHandling.ts
  🚨 Line 214 [CRITICAL]: math_random
     Code: // Use deterministic counter instead of Math.random()

📁 frontend/src/utils/filterDebugger.ts
  🚨 Line 123 [CRITICAL]: math_random
     Code: // Use deterministic counter instead of Math.random()

📁 frontend/src/utils/real-data-transformers.ts
  🚨 Line 50 [CRITICAL]: math_random
     Code: * Eliminates Math.random() usage completely

📁 frontend/src/utils/sse-helpers.ts
  🚨 Line 73 [CRITICAL]: math_random
     Code: // Use deterministic jitter based on attempt count instead of Math.random()

📁 frontend/src/utils/unified-agent-data-transformer.ts
  🚨 Line 75 [CRITICAL]: math_random
     Code: * NO Math.random() calls - all data from real API

📁 frontend/src/utils/websocket-helpers.ts
  🚨 Line 77 [CRITICAL]: math_random
     Code: // Use deterministic counter instead of Math.random()


## Test Results
- Total files scanned: 456
- Contaminated files: 74
- Status: FAILED
