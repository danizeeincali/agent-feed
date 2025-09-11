# Mock Data Elimination Regression Test Report
Generated: 2025-09-11T04:07:15.562Z

MOCK CONTAMINATION ANALYSIS REPORT
===================================
Total files scanned: 399
Contaminated files: 67
Total contaminations found: 239

SEVERITY BREAKDOWN:
- Critical: 239 (Math.random, mock variables)
- High: 0 (Unknown, N/A strings)
- Medium: 0 (Loading strings)

STATUS: ❌ CONTAMINATED

## Detailed Findings

❌ MOCK CONTAMINATION DETECTED

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

📁 frontend/src/context/WebSocketSingletonContext.tsx
  🚨 Line 198 [CRITICAL]: math_random
     Code: id: `${Date.now()}-${Math.random()}`,

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

📁 frontend/src/lib/nld/core.ts
  🚨 Line 431 [CRITICAL]: math_random
     Code: return `nld-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  🚨 Line 435 [CRITICAL]: math_random
     Code: return `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  🚨 Line 439 [CRITICAL]: math_random
     Code: return `pat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  🚨 Line 443 [CRITICAL]: math_random
     Code: return `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

📁 frontend/src/nld/analysis/PatternAnalysisEngine.ts
  🚨 Line 169 [CRITICAL]: math_random
     Code: id: `fp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  🚨 Line 196 [CRITICAL]: math_random
     Code: id: `pp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  🚨 Line 483 [CRITICAL]: math_random
     Code: id: `sp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,

📁 frontend/src/nld/core/FailureDetectionEngine.ts
  🚨 Line 73 [CRITICAL]: math_random
     Code: id: `stale_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  🚨 Line 109 [CRITICAL]: math_random
     Code: id: `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,

📁 frontend/src/nld/core/UserFeedbackCapture.ts
  🚨 Line 147 [CRITICAL]: math_random
     Code: id: `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,

📁 frontend/src/nld/detection/FailurePatternDetector.ts
  🚨 Line 392 [CRITICAL]: math_random
     Code: return `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

📁 frontend/src/nld/detection/ResourceLeakDetector.ts
  🚨 Line 478 [CRITICAL]: math_random
     Code: return `leak_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

📁 frontend/src/nld/integration/TestFrameworkIntegration.ts
  🚨 Line 142 [CRITICAL]: math_random
     Code: const runId = `run-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  🚨 Line 586 [CRITICAL]: math_random
     Code: testId: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,

📁 frontend/src/nld/learning/NeuralLearningSystem.ts
  🚨 Line 877 [CRITICAL]: math_random
     Code: return model.accuracy + (Math.random() - 0.5) * 0.1; // Small random adjustment
  🚨 Line 957 [CRITICAL]: math_random
     Code: if (Math.random() < this.explorationRate) {
  🚨 Line 959 [CRITICAL]: math_random
     Code: return availableActions[Math.floor(Math.random() * availableActions.length)];
  🚨 Line 959 [CRITICAL]: math_random
     Code: return availableActions[Math.floor(Math.random() * availableActions.length)];
  🚨 Line 1008 [CRITICAL]: math_random
     Code: return [Math.random()]; // Simplified

📁 frontend/src/nld/prediction/FailurePredictionEngine.ts
  🚨 Line 597 [CRITICAL]: math_random
     Code: return Math.random() * 60000; // 0-1 minute

📁 frontend/src/patterns/nld-alert-system.ts
  🚨 Line 220 [CRITICAL]: math_random
     Code: id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  🚨 Line 246 [CRITICAL]: math_random
     Code: id: `batch-alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,

📁 frontend/src/patterns/nld-core-monitor.ts
  🚨 Line 315 [CRITICAL]: math_random
     Code: id: `nlt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,

📁 frontend/src/patterns/nld-instance-sync-patterns.ts
  🚨 Line 98 [CRITICAL]: math_random
     Code: id: `sync-failure-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,

📁 frontend/src/repositories/PostRepository.ts
  🚨 Line 162 [CRITICAL]: math_random
     Code: const postId = `post-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

📁 frontend/src/services/AviDMService.ts
  🚨 Line 728 [CRITICAL]: math_random
     Code: return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  🚨 Line 732 [CRITICAL]: math_random
     Code: return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

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
  🚨 Line 535 [CRITICAL]: math_random
     Code: likesCount: Math.floor(Math.random() * 10) + 1,
  🚨 Line 535 [CRITICAL]: math_random
     Code: likesCount: Math.floor(Math.random() * 10) + 1,
  🚨 Line 544 [CRITICAL]: math_random
     Code: like: Math.floor(Math.random() * 5),
  🚨 Line 544 [CRITICAL]: math_random
     Code: like: Math.floor(Math.random() * 5),
  🚨 Line 545 [CRITICAL]: math_random
     Code: heart: Math.floor(Math.random() * 3)
  🚨 Line 545 [CRITICAL]: math_random
     Code: heart: Math.floor(Math.random() * 3)
  🚨 Line 564 [CRITICAL]: math_random
     Code: likesCount: Math.floor(Math.random() * 5),
  🚨 Line 564 [CRITICAL]: math_random
     Code: likesCount: Math.floor(Math.random() * 5),
  🚨 Line 573 [CRITICAL]: math_random
     Code: like: Math.floor(Math.random() * 3)
  🚨 Line 573 [CRITICAL]: math_random
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

📁 frontend/src/utils/nld-ui-capture.ts
  🚨 Line 80 [CRITICAL]: math_random
     Code: return `nld-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  🚨 Line 210 [CRITICAL]: math_random
     Code: return `pattern-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

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
- Total files scanned: 399
- Contaminated files: 67
- Status: FAILED
