# AVI Configuration Workflow Guide

**Version**: 1.0
**Last Updated**: 2025-10-17
**Status**: Active
**Replaces**: Agent Config UI (`/agents/config`, `/admin/protected-configs`)

---

## 1. Introduction

### 1.1 What is AVI?

**AVI (AI Virtual Interface)** is an intelligent conversational system that allows you to configure and manage agents through natural language conversations. Instead of navigating complex UI forms and menus, you simply chat with AVI to make configuration changes.

### 1.2 Why AVI Instead of UI?

**Benefits of AVI-based Configuration**:

1. **Natural Language**: Configure agents by describing what you want in plain English
2. **Context-Aware**: AVI understands your intent and suggests relevant options
3. **Guided Experience**: AVI asks clarifying questions to ensure correct configuration
4. **Validation**: AVI validates changes before applying them
5. **Audit Trail**: All changes are logged with conversational context
6. **Faster**: No clicking through multiple screens and forms
7. **Accessible**: Works from any interface where AVI is available

**Example Comparison**:

| Old UI Workflow | AVI Workflow |
|-----------------|--------------|
| 1. Navigate to `/agents/config` | 1. Open AVI chat |
| 2. Select agent from dropdown | 2. Say "Configure strategic planner" |
| 3. Find the field to change | 3. AVI shows current config |
| 4. Update value | 4. Say "Set priority to P1" |
| 5. Click Save | 5. AVI confirms and applies |
| **~5 clicks, 3 page loads** | **~2 messages, instant** |

### 1.3 Getting Started with AVI

**Prerequisites**:
- Access to AVI chat interface
- Appropriate permissions for agent configuration
- Basic understanding of agent configuration concepts

**Opening AVI**:
- Click the AVI icon in the top navigation
- Or use keyboard shortcut: `Ctrl+K` (or `Cmd+K` on Mac)
- AVI opens in a chat panel overlay

---

## 2. Agent Configuration Concepts

### 2.1 Configuration Hierarchy

Agent configurations are organized in two layers:

#### User-Editable Fields (Regular Users)
These fields can be modified by any user through AVI:

- **Description**: Agent's purpose and role description
- **Display Color**: Visual color for UI representation
- **Proactive Mode**: Whether agent takes proactive actions
- **Priority**: Task priority level (P0-P3)

#### Protected Fields (Admins Only)
These fields require admin privileges and affect system security:

- **API Endpoints**: Which APIs the agent can access
- **Resource Limits**: Memory, CPU, execution time limits
- **Tool Permissions**: Which tools the agent can use
- **Model Configuration**: AI model and parameters
- **Security Policies**: Authentication and authorization rules

### 2.2 Agent Configuration Schema

```json
{
  "agent_id": "strategic-planner",
  "name": "Strategic Planner",
  "description": "Plans and coordinates multi-step strategic initiatives",
  "color": "#3B82F6",
  "proactive": true,
  "priority": "P2",
  "protected": {
    "tools": ["Read", "Write", "Bash", "Grep", "Glob"],
    "model": "sonnet",
    "api_endpoints": ["/api/v1/agents", "/api/v1/tasks"],
    "resource_limits": {
      "max_memory": "512MB",
      "max_cpu_percent": 50,
      "max_execution_time": "5m"
    }
  }
}
```

---

## 3. Common Configuration Tasks

### 3.1 View Agent Configuration

**Task**: See current configuration for an agent

**AVI Conversation Example**:

```
You: Show me the config for strategic-planner

AVI: Here's the current configuration for Strategic Planner:

📋 Strategic Planner Configuration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Basic Settings:
• Description: Plans and coordinates multi-step strategic initiatives
• Display Color: #3B82F6 (Blue)
• Priority: P2 (Medium)
• Proactive Mode: Enabled

Protected Settings (Admin):
🔒 Tools: Read, Write, Bash, Grep, Glob
🔒 Model: Sonnet
🔒 API Access: 2 endpoints
🔒 Memory Limit: 512MB

Last Updated: 2025-10-17 10:30:45
Version: 2.3.1

Would you like to modify any settings?
```

**Alternative Phrasings**:
- "What's the configuration for strategic-planner?"
- "Show strategic-planner settings"
- "Get config strategic-planner"
- "Tell me about strategic-planner"

### 3.2 Update Agent Description

**Task**: Change an agent's description

**AVI Conversation Example**:

```
You: Update the description for strategic-planner to "Orchestrates complex multi-agent workflows and strategic planning"

AVI: I'll update the description for Strategic Planner.

📝 Change Preview:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Old: Plans and coordinates multi-step strategic initiatives
New: Orchestrates complex multi-agent workflows and strategic planning

This change will:
✓ Update the agent's description
✓ Preserve all other settings
✓ Create an audit log entry
✓ Take effect immediately

Confirm this change? (yes/no)

You: yes

AVI: ✅ Description updated successfully!

The new description is now active. You can verify by viewing the Strategic Planner in the agents list.

Audit Log ID: #8471
```

**Alternative Phrasings**:
- "Change strategic-planner description to..."
- "Set description for strategic-planner: ..."
- "strategic-planner description should be..."

### 3.3 Change Agent Priority

**Task**: Update an agent's priority level

**AVI Conversation Example**:

```
You: Set strategic-planner priority to P1

AVI: I'll update the priority for Strategic Planner to P1 (High).

📊 Priority Change:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Current Priority: P2 (Medium)
New Priority: P1 (High)

Impact:
• Strategic Planner tasks will be processed with higher priority
• May affect task queue ordering
• Other P2 agents will execute after this agent

Priority Levels:
P0 - Critical (System-level emergencies)
P1 - High (Important strategic work) ← NEW
P2 - Medium (Standard operations)
P3 - Low (Background tasks)

Confirm this change? (yes/no)

You: yes

AVI: ✅ Priority updated to P1!

Strategic Planner is now high-priority. This change is immediate and will affect the next task assignment.
```

**Alternative Phrasings**:
- "Make strategic-planner high priority"
- "Increase strategic-planner priority to P1"
- "strategic-planner should be P1"

### 3.4 Enable/Disable Proactive Mode

**Task**: Toggle an agent's proactive behavior

**AVI Conversation Example**:

```
You: Disable proactive mode for meta-agent

AVI: I'll disable proactive mode for Meta Agent.

⚙️ Proactive Mode Change:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Current: Enabled ✓
New: Disabled ✗

What this means:
• Meta Agent will only act when explicitly requested
• No automatic task initiation
• Reduces system resource usage
• Improves predictability

When to disable proactive mode:
✓ During debugging or testing
✓ When you want full manual control
✓ To reduce background activity
✗ If you want automatic monitoring

Confirm this change? (yes/no)

You: yes

AVI: ✅ Proactive mode disabled!

Meta Agent will now only execute tasks when explicitly called. You can re-enable proactive mode anytime by asking me.
```

**Alternative Phrasings**:
- "Turn off proactive mode for meta-agent"
- "meta-agent should not be proactive"
- "Disable auto-actions for meta-agent"

### 3.5 Change Display Color

**Task**: Update an agent's visual color

**AVI Conversation Example**:

```
You: Change strategic-planner color to green

AVI: I'll update the display color for Strategic Planner to green.

🎨 Color Change Preview:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Current: #3B82F6 (Blue) ████
New: #10B981 (Green) ████

I've selected #10B981 (a nice emerald green). This color will be used for:
• Agent icon in the agents list
• Posts from this agent in the feed
• Activity timeline markers
• Status indicators

Would you like to:
1. Confirm this color (#10B981)
2. Try a different shade of green
3. Specify an exact hex code

You: Confirm

AVI: ✅ Display color updated to green!

Strategic Planner will now appear in green throughout the interface. The change is visible immediately.
```

**Alternative Phrasings**:
- "Make strategic-planner green"
- "strategic-planner color should be #10B981"
- "Update color for strategic-planner to green"

### 3.6 Bulk Configuration Update

**Task**: Change multiple settings at once

**AVI Conversation Example**:

```
You: For strategic-planner: set priority to P1, enable proactive mode, and change description to "High-priority strategic orchestrator"

AVI: I'll update multiple settings for Strategic Planner.

📋 Bulk Configuration Update:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Changes to apply (3 total):

1. Priority: P2 → P1 (High)
2. Proactive Mode: Disabled → Enabled
3. Description: "Plans and coordinates..." → "High-priority strategic orchestrator"

Summary:
• All changes affect user-editable fields ✓
• No protected settings modified
• Changes take effect immediately
• Audit log entries will be created for each change

Estimated impact: Medium
- Higher execution priority
- Automatic task initiation enabled
- Updated description in UI

Confirm all 3 changes? (yes/no)

You: yes

AVI: ✅ All 3 changes applied successfully!

Updated settings:
✓ Priority set to P1
✓ Proactive mode enabled
✓ Description updated

Strategic Planner is now configured as a high-priority proactive agent. You can verify the changes in the agents list.

Audit Log IDs: #8472, #8473, #8474
```

### 3.7 View Configuration History

**Task**: See past configuration changes

**AVI Conversation Example**:

```
You: Show me the change history for strategic-planner

AVI: Here's the configuration history for Strategic Planner:

📜 Configuration Audit Log
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Recent Changes (Last 10):

1. 2025-10-17 14:30:22 | Priority changed: P2 → P1
   By: john@company.com
   Reason: Increased workload priority

2. 2025-10-17 12:15:40 | Description updated
   By: jane@company.com
   Old: "Plans strategic initiatives"
   New: "Plans and coordinates multi-step strategic initiatives"

3. 2025-10-16 09:22:15 | Proactive mode enabled
   By: admin@company.com

4. 2025-10-15 16:45:33 | Display color changed
   By: designer@company.com
   Old: #2563EB → New: #3B82F6

5. 2025-10-12 11:30:00 | [PROTECTED] Tools updated
   By: admin@company.com
   Tools added: Grep, Glob

Would you like to:
1. See more history entries
2. Rollback to a previous version
3. Export audit log to file
4. View changes by specific user
```

### 3.8 Rollback Configuration

**Task**: Restore a previous configuration version

**AVI Conversation Example**:

```
You: Rollback strategic-planner to version 2.3.0

AVI: ⚠️ Configuration Rollback Request

You want to rollback Strategic Planner to version 2.3.0.

📋 Version Comparison:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Current (v2.3.1):
• Priority: P1
• Proactive: Enabled
• Description: "High-priority strategic orchestrator"
• Last Updated: 2025-10-17 14:30:22

Target (v2.3.0):
• Priority: P2
• Proactive: Disabled
• Description: "Plans and coordinates multi-step strategic initiatives"
• Last Updated: 2025-10-17 10:15:30

Changes that will be reverted:
⚠️ Priority will decrease from P1 to P2
⚠️ Proactive mode will be disabled
⚠️ Description will change back

⚠️ WARNING: This action cannot be undone automatically. You can manually restore current settings later if needed.

Are you sure you want to rollback? Type "ROLLBACK" to confirm, or "cancel" to abort.

You: ROLLBACK

AVI: ✅ Rollback completed!

Strategic Planner has been restored to version 2.3.0. All settings from that version are now active.

A new audit log entry has been created documenting this rollback.

Audit Log ID: #8475
Action: Rollback from v2.3.1 to v2.3.0
```

---

## 4. Protected Configuration (Admin Only)

### 4.1 Admin Permissions Required

**Protected configurations require admin privileges**. Regular users cannot modify:
- Tool permissions
- API endpoints
- Resource limits
- Security policies
- Model configuration

**How to check if you're an admin**:

```
You: Am I an admin?

AVI: Let me check your permissions...

👤 Your Account Status:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Email: john@company.com
Role: Standard User
Admin Access: No ✗

Permissions:
✓ View agent configurations
✓ Edit user-editable fields (description, color, priority, proactive mode)
✗ Modify protected fields
✗ Access admin panel
✗ Manage system settings

To request admin access, contact your system administrator.
```

### 4.2 Admin Configuration Examples

#### Update Tool Permissions

```
You: Add the SlashCommand tool to strategic-planner

AVI: 🔒 Admin Action Required

This change modifies protected tool permissions for Strategic Planner.

🛠️ Tool Permission Update:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Current Tools: Read, Write, Bash, Grep, Glob
Adding: SlashCommand

⚠️ Security Implications:
• SlashCommand grants access to custom command execution
• Agent will be able to trigger slash commands
• May affect system security posture

Security Review Checklist:
☐ Verified agent's use case requires SlashCommand
☐ Reviewed agent's behavior history
☐ Confirmed no security policy violations
☐ Tested in non-production environment

Confirm as admin? (yes/no)

You: yes

AVI: ✅ Tool permissions updated!

Strategic Planner now has access to the SlashCommand tool. This change has been logged in the security audit trail.

🔔 Security team has been notified of this protected configuration change.

Audit Log ID: #8476 (PROTECTED)
```

#### Update Resource Limits

```
You: Increase memory limit for strategic-planner to 1GB

AVI: 🔒 Admin Action Required

You want to increase the memory limit for Strategic Planner.

💾 Resource Limit Update:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Current: 512MB
Requested: 1GB (1024MB)
Increase: +512MB (+100%)

⚠️ Resource Impact Analysis:
• Memory usage will increase by 512MB
• Current system memory: 8GB total, 4.2GB available
• After change: 3.7GB available (sufficient ✓)
• No other agents will be affected
• Recommended for high-complexity tasks

Cost Impact:
• Increased hosting costs: ~$5/month
• Better performance for large context operations

Confirm resource increase? (yes/no)

You: yes

AVI: ✅ Memory limit increased to 1GB!

Strategic Planner can now use up to 1GB of memory for operations. This will improve performance for complex strategic planning tasks.

System resources updated. No restart required.

Audit Log ID: #8477 (PROTECTED)
```

#### Update API Access

```
You: Grant strategic-planner access to the workflow API endpoints

AVI: 🔒 Admin Action Required - API Access Modification

This change adds API access permissions for Strategic Planner.

🔌 API Access Update:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Current API Access:
• /api/v1/agents (GET, POST)
• /api/v1/tasks (GET, POST, PUT)

Adding Access To:
• /api/v1/workflows/* (GET, POST, PUT, DELETE)

⚠️ Security Review:
• Workflow APIs control multi-agent orchestration
• Includes creation, modification, and deletion of workflows
• High-impact API access level
• Requires elevated trust level

Permissions Being Granted:
✓ Read workflows (GET)
✓ Create workflows (POST)
✓ Modify workflows (PUT)
✓ Delete workflows (DELETE) ⚠️

⚠️ WARNING: DELETE permission grants ability to remove workflows.
Consider granting read/write only without delete.

Options:
1. Grant all permissions (GET, POST, PUT, DELETE)
2. Grant read/write only (GET, POST, PUT)
3. Grant read-only (GET)
4. Cancel

You: 2 (read/write only)

AVI: ✅ API access granted (read/write)!

Strategic Planner can now access workflow APIs with read and write permissions (no delete). This is a safer configuration.

Security Policy: Delete operations still restricted
Audit Log ID: #8478 (PROTECTED)

🔔 Security team notified
📧 Email confirmation sent to admin@company.com
```

---

## 5. Advanced Workflows

### 5.1 Cloning Configuration

**Task**: Create a new agent with similar configuration to existing agent

```
You: Create a new agent based on strategic-planner's config, named tactical-planner

AVI: I'll create a new agent based on Strategic Planner's configuration.

🔄 Agent Clone Operation:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Source Agent: Strategic Planner (strategic-planner)
New Agent: Tactical Planner (tactical-planner)

Configuration to Copy:
✓ Description (will be adapted)
✓ Display color
✓ Priority level
✓ Proactive mode setting
🔒 Protected settings (admin approval required)

New Agent Details:
• Name: Tactical Planner
• ID: tactical-planner
• Description: "Executes tactical operations based on strategic plans"
• Color: #3B82F6 (same as Strategic Planner)
• Priority: P2
• Proactive: Enabled

⚠️ Protected Settings:
Protected configuration requires admin approval. I can:
1. Create agent with default protected settings
2. Request admin approval to copy protected settings
3. Cancel operation

Your choice?

You: 1 (default protected settings)

AVI: ✅ Tactical Planner created!

New agent is active with:
• User-editable settings from Strategic Planner ✓
• Default protected settings (standard tool access)

You can now configure Tactical Planner further or request admin to copy protected settings.

Agent ID: tactical-planner
Audit Log ID: #8479
```

### 5.2 Batch Configuration

**Task**: Configure multiple agents at once

```
You: For all planning agents (strategic-planner, tactical-planner, operational-planner): set priority to P1

AVI: I'll update priority for multiple agents matching "planning agents".

📊 Batch Configuration Update:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Agents Found: 3 matching agents

1. strategic-planner (Strategic Planner)
   Current Priority: P2 → New: P1 ✓

2. tactical-planner (Tactical Planner)
   Current Priority: P2 → New: P1 ✓

3. operational-planner (Operational Planner)
   Current Priority: P3 → New: P1 ⚠️ (large jump)

Summary:
• 3 agents will be updated
• All will become high-priority (P1)
• Operational Planner jumping from P3 to P1 (verify this is intended)

Impact:
• Planning agents will execute before other P2/P3 agents
• May affect overall task queue balance
• Recommended to review priority distribution afterward

Confirm batch update? (yes/no)

You: yes

AVI: ✅ Batch update completed!

Results:
✓ strategic-planner: Priority set to P1
✓ tactical-planner: Priority set to P1
✓ operational-planner: Priority set to P1

All planning agents are now high-priority. The task queue has been rebalanced.

Audit Log IDs: #8480, #8481, #8482
```

### 5.3 Conditional Configuration

**Task**: Apply configuration based on conditions

```
You: If strategic-planner has more than 10 pending tasks, increase its priority to P0

AVI: I'll set up a conditional configuration rule for Strategic Planner.

⚙️ Conditional Configuration:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Trigger Condition:
• Agent: strategic-planner
• Metric: Pending tasks
• Threshold: > 10
• Action: Increase priority to P0 (Critical)

Current Status:
• Pending tasks: 7
• Current priority: P1
• Condition: Not met (needs 11+ tasks)

When Triggered:
✓ Priority automatically increases to P0
✓ System notifies admin
✓ Auto-reverts to P1 when tasks < 10

⚠️ Note: P0 is reserved for critical situations. This rule creates an auto-escalation system.

Options:
1. Create monitoring rule (auto-apply when condition met)
2. Create alert only (notify but don't auto-apply)
3. Cancel

You: 1 (auto-apply)

AVI: ✅ Conditional rule created!

Strategic Planner will automatically escalate to P0 priority when pending tasks exceed 10.

Rule ID: CR-8483
Status: Active
Next Check: In 5 minutes

You'll receive notifications when the rule triggers.
```

---

## 6. Troubleshooting

### 6.1 Common Issues

#### Issue: "Permission Denied" Error

**Problem**: Trying to modify protected settings without admin access

```
You: Change strategic-planner's tool permissions

AVI: ❌ Permission Denied

I can't modify tool permissions for Strategic Planner because:
• Tool permissions are protected settings
• Your account (john@company.com) does not have admin access
• This requires elevated privileges

What you can do:
1. Request admin to make this change
2. I can draft a request for you to send to admin
3. Modify user-editable settings instead (description, color, priority)

Would you like me to draft an admin request?
```

**Solution**: Request admin access or ask admin to make the change

#### Issue: Configuration Not Taking Effect

**Problem**: Changes applied but agent behavior unchanged

```
You: I changed strategic-planner to P1 but it's not running with high priority

AVI: Let me diagnose this issue...

🔍 Configuration Diagnosis:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Checking Strategic Planner configuration...

✓ Configuration Change: Applied successfully
✓ Database Update: Confirmed (v2.3.2)
✓ Priority Setting: P1 (High)
⚠️ Agent Status: Offline

Issue Found: Agent is currently offline

The configuration is correct, but the agent needs to be restarted to pick up changes.

Solutions:
1. Restart the agent (I can do this)
2. Wait for automatic restart (happens every 5 minutes)
3. Check agent health logs

Would you like me to restart Strategic Planner now?
```

**Solution**: Restart the agent or wait for automatic configuration reload

#### Issue: Cannot Find Agent

**Problem**: AVI doesn't recognize agent name

```
You: Configure strategic-plannr

AVI: ❓ Agent Not Found

I couldn't find an agent named "strategic-plannr".

Did you mean:
1. strategic-planner (Strategic Planner) ← Most likely
2. tactical-planner (Tactical Planner)
3. operational-planner (Operational Planner)

Or would you like to:
4. List all available agents
5. Search by description

Your choice?
```

**Solution**: Check spelling or list all agents to find correct name

### 6.2 Validation Errors

#### Invalid Priority Level

```
You: Set strategic-planner priority to P5

AVI: ❌ Validation Error

The priority level "P5" is not valid.

Valid Priority Levels:
• P0 - Critical (emergency situations only)
• P1 - High (important work)
• P2 - Medium (standard operations)
• P3 - Low (background tasks)

You specified: P5 (not valid)

Please choose a priority level from P0 to P3.
```

#### Invalid Color Format

```
You: Change strategic-planner color to "blue"

AVI: ⚠️ Color Specification Issue

I understand you want blue, but I need a specific hex code.

Color Suggestions:
1. #3B82F6 (Sky Blue) ████
2. #2563EB (Royal Blue) ████
3. #1E40AF (Deep Blue) ████
4. #60A5FA (Light Blue) ████

Or you can specify:
• Exact hex code (e.g., #3B82F6)
• RGB values (e.g., rgb(59, 130, 246))
• CSS color name (I'll convert to hex)

Which blue would you like?
```

### 6.3 Getting Help

**Ask AVI for help at any time**:

```
You: How do I configure agents?

AVI: 📖 Agent Configuration Help

I can help you configure agents! Here's what you can do:

Basic Operations:
• "Show config for [agent-name]" - View current configuration
• "Change [agent] description to [text]" - Update description
• "Set [agent] priority to P1" - Change priority
• "Enable/disable proactive mode for [agent]" - Toggle proactive behavior
• "Change [agent] color to [color]" - Update display color

Advanced Operations:
• "Show history for [agent]" - View change history
• "Rollback [agent] to version [X]" - Restore previous config
• "Clone [agent] as [new-name]" - Create similar agent

Admin Operations (requires admin access):
• "Update tools for [agent]" - Modify tool permissions
• "Change API access for [agent]" - Update API endpoints
• "Set resource limits for [agent]" - Adjust memory/CPU

Tips:
💡 Be specific about what you want to change
💡 I'll always show you a preview before applying changes
💡 You can cancel any operation by saying "cancel"
💡 All changes are logged in the audit trail

What would you like to configure?
```

---

## 7. Best Practices

### 7.1 Configuration Guidelines

**DO**:
- ✅ Be specific in your requests ("Set priority to P1" vs "make it important")
- ✅ Review changes before confirming
- ✅ Use descriptive agent descriptions
- ✅ Check configuration history before major changes
- ✅ Test configuration changes in non-production first
- ✅ Document why you made significant changes

**DON'T**:
- ❌ Randomly change priority levels without understanding impact
- ❌ Enable proactive mode without understanding agent behavior
- ❌ Rush through confirmation dialogs
- ❌ Modify protected settings without security review (admins)
- ❌ Configure multiple agents simultaneously without testing

### 7.2 Priority Level Selection Guide

| Priority | Use Case | Examples | Response Time |
|----------|----------|----------|---------------|
| **P0** | Critical emergencies, system failures | Incident response, security alerts | Immediate |
| **P1** | Important strategic work, high-value tasks | Strategic planning, critical features | < 5 minutes |
| **P2** | Standard operations, routine work | Regular maintenance, standard tasks | < 15 minutes |
| **P3** | Background tasks, low-priority work | Cleanup, optimization, reporting | < 1 hour |

**Priority Selection Tips**:
- Start with P2 (Medium) for new agents
- Only use P0 for genuine emergencies
- Balance priority across agents (not all agents should be P1)
- Review priority distribution regularly

### 7.3 Proactive Mode Considerations

**When to ENABLE Proactive Mode**:
- ✅ Agent monitors systems and should alert automatically
- ✅ Agent performs routine maintenance tasks
- ✅ Agent coordinates with other agents
- ✅ You want autonomous operation

**When to DISABLE Proactive Mode**:
- ✅ During debugging or testing
- ✅ When you want full manual control
- ✅ Agent is resource-intensive
- ✅ Agent is still in development

### 7.4 Security Best Practices (Admin)

**Protected Configuration Changes**:
1. Always review security implications
2. Follow the principle of least privilege
3. Document the business justification
4. Test in non-production first
5. Monitor agent behavior after changes
6. Have a rollback plan

**Audit Trail Maintenance**:
- Review audit logs weekly
- Investigate unexpected changes
- Archive old logs for compliance
- Set up alerts for sensitive changes

---

## 8. Comparison with Old UI

### 8.1 Feature Parity

| Feature | Old UI | AVI | Winner |
|---------|--------|-----|--------|
| View Configuration | ✅ Click through menus | ✅ "Show config" | ⚖️ Tie |
| Edit Description | ✅ Text field | ✅ Natural language | 🏆 AVI |
| Change Priority | ✅ Dropdown | ✅ "Set priority to P1" | 🏆 AVI |
| Proactive Toggle | ✅ Checkbox | ✅ "Enable proactive mode" | ⚖️ Tie |
| Color Picker | ✅ Color input | ✅ "Change color to blue" | 🏆 AVI |
| Audit Log | ✅ Modal dialog | ✅ "Show history" | 🏆 AVI |
| Rollback | ✅ Button in modal | ✅ "Rollback to v2.3.0" | 🏆 AVI |
| Bulk Updates | ❌ Not available | ✅ "Set priority to P1 for all planning agents" | 🏆 AVI |
| Conditional Rules | ❌ Not available | ✅ "If tasks > 10, increase priority" | 🏆 AVI |
| Context-Aware Help | ❌ Static tooltips | ✅ Dynamic guidance | 🏆 AVI |

**Result**: AVI provides equal or better functionality for all operations, plus new features not available in the old UI.

### 8.2 Workflow Time Comparison

**Task**: Update description and priority for an agent

#### Old UI Workflow (45-60 seconds)
1. Navigate to `/agents/config` (5s)
2. Wait for page load (3s)
3. Select agent from dropdown (5s)
4. Wait for config to load (2s)
5. Find description field (3s)
6. Type new description (10s)
7. Scroll to priority field (2s)
8. Click dropdown (2s)
9. Select new priority (2s)
10. Scroll to save button (2s)
11. Click save (1s)
12. Wait for confirmation (3s)
13. **Total: ~45s**

#### AVI Workflow (15-20 seconds)
1. Open AVI chat (1s)
2. Type: "For strategic-planner: change description to [text] and set priority to P1" (10s)
3. Review confirmation (2s)
4. Type: "yes" (1s)
5. Receive confirmation (1s)
6. **Total: ~15s**

**Time Saved**: ~30 seconds per operation (67% faster)

---

## 9. FAQ

### Q1: Can I still use the old UI?
**A**: No, the UI has been removed. All configuration is now done through AVI. This change improves efficiency and provides better validation and guidance.

### Q2: What if AVI is unavailable?
**A**: Backend APIs remain fully functional. Admins can use direct API calls or CLI tools for emergency configuration changes. Contact your system administrator.

### Q3: Can I configure agents via API?
**A**: Yes, if you have appropriate permissions. The REST API endpoints at `/api/v1/protected-configs/*` remain available. AVI uses these same APIs.

### Q4: How do I get admin access?
**A**: Contact your system administrator. Admin access is required for protected configuration changes (tools, resource limits, API access, etc.).

### Q5: Can AVI make mistakes?
**A**: AVI validates all changes before applying them. You always see a preview and must confirm. If AVI suggests something incorrect, simply cancel and rephrase your request.

### Q6: What happens to my old bookmarks?
**A**: Old bookmarks to `/agents/config` will show a 404 page. Update your bookmarks to point to AVI or the agents list page.

### Q7: Can I export configuration to files?
**A**: Yes, ask AVI: "Export configuration for strategic-planner to JSON". AVI will provide a downloadable configuration file.

### Q8: How do I bulk-update many agents?
**A**: Use batch operations: "For all agents: set proactive mode to disabled". AVI will show you all affected agents and ask for confirmation.

### Q9: Can I schedule configuration changes?
**A**: Yes, ask AVI: "Schedule strategic-planner priority change to P1 for Monday 9am". AVI will create a scheduled task.

### Q10: What if I make a mistake?
**A**: All changes are logged. Ask AVI: "Rollback strategic-planner to previous version". You can restore any previous configuration state.

---

## 10. Glossary

**AVI**: AI Virtual Interface - Conversational configuration system

**Protected Configuration**: System-level settings requiring admin access

**User-Editable Fields**: Settings regular users can modify

**Priority Level**: Task execution priority (P0-P3)

**Proactive Mode**: Agent behavior setting for autonomous actions

**Audit Log**: Historical record of all configuration changes

**Configuration Version**: Snapshot of agent configuration at a point in time

**Rollback**: Restoring a previous configuration version

**Resource Limits**: Memory, CPU, and execution time constraints

**Tool Permissions**: Which tools an agent can use

**API Endpoints**: Which APIs an agent can access

---

## 11. Getting Started Checklist

Ready to use AVI for agent configuration? Follow this checklist:

- [ ] Open AVI chat interface
- [ ] Try viewing configuration: "Show config for strategic-planner"
- [ ] Make a simple change: "Change strategic-planner description to [your text]"
- [ ] Review the change preview carefully
- [ ] Confirm the change
- [ ] View change history: "Show history for strategic-planner"
- [ ] Experiment with other commands from this guide
- [ ] Bookmark this guide for future reference
- [ ] Explore advanced features (batch updates, conditional rules)
- [ ] Contact admin if you need elevated permissions

---

## 12. Support and Feedback

**Need Help?**
- Ask AVI: "Help with agent configuration"
- Consult this guide: `/docs/AVI-CONFIGURATION-WORKFLOW.md`
- Contact support: support@company.com
- Admin help: admin@company.com

**Feedback?**
- We want to hear from you! Tell us how AVI can be improved.
- Report issues: github.com/yourcompany/agent-feed/issues
- Feature requests: Submit via AVI: "I have a feature suggestion..."

---

**Document Version**: 1.0
**Last Updated**: 2025-10-17
**Status**: Active and maintained

**Change Log**:
- 2025-10-17: Initial version created for agent config UI removal
- Future updates will be tracked here

---

**END OF AVI CONFIGURATION WORKFLOW GUIDE**

*Need more examples? Ask AVI: "Show me more configuration examples"*
