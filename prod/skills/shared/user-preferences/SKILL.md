---
name: User Preferences
description: User preference management patterns, schema definitions, and personalization frameworks for AVI agents
version: "1.0.0"
category: shared
_protected: false
---

# User Preferences Skill

## Purpose
Provides standardized patterns for managing user preferences, personalization settings, and contextual adaptations across all AVI agents. Ensures consistent user experience and preference persistence.

## When to Use This Skill
- Storing user configuration settings
- Personalizing agent responses
- Adapting UI/UX based on user preferences
- Managing communication style preferences
- Tracking user workflow patterns
- Implementing adaptive agent behavior

## User Preference Schema

### Core Preference Structure
```json
{
  "userId": "unique-user-id",
  "lastUpdated": "2025-10-18T12:00:00Z",
  "version": "1.0.0",
  "preferences": {
    "communication": {...},
    "workflow": {...},
    "ui": {...},
    "agents": {...},
    "privacy": {...}
  }
}
```

### Communication Preferences
```json
{
  "communication": {
    "style": "professional|casual|technical|friendly",
    "verbosity": "concise|balanced|detailed",
    "tone": "formal|approachable|enthusiastic",
    "emojiUsage": "never|minimal|moderate|frequent",
    "notificationPreference": "immediate|batched|daily|off",
    "preferredLanguage": "en|es|fr|de|ja",
    "timeZone": "America/New_York"
  }
}
```

### Workflow Preferences
```json
{
  "workflow": {
    "defaultPriority": "P0|P1|P2|P3",
    "autoTaskCreation": true|false,
    "delegationStyle": "manual|automatic|suggested",
    "workingHours": {
      "start": "09:00",
      "end": "17:00",
      "timezone": "America/New_York"
    },
    "focusMode": {
      "enabled": true|false,
      "quietHours": ["22:00-08:00"]
    },
    "taskGrouping": "priority|project|deadline|context"
  }
}
```

### UI/UX Preferences
```json
{
  "ui": {
    "theme": "light|dark|auto",
    "density": "compact|comfortable|spacious",
    "sidebarPosition": "left|right",
    "defaultView": "feed|dashboard|tasks|calendar",
    "animations": true|false,
    "fontScale": 0.8|1.0|1.2|1.4,
    "colorMode": "colorful|minimal|monochrome"
  }
}
```

### Agent-Specific Preferences
```json
{
  "agents": {
    "personal-todos-agent": {
      "defaultPriority": "P2",
      "autoArchive": true,
      "showCompleted": false,
      "sortBy": "priority|deadline|created"
    },
    "meeting-prep-agent": {
      "defaultDuration": 30,
      "reminderMinutes": 15,
      "includeAgenda": true,
      "autoFollowUp": true
    },
    "Λvi": {
      "proactiveness": "high|medium|low",
      "strategicInsights": "always|daily|weekly",
      "coordinationStyle": "hands-on|oversight|minimal"
    }
  }
}
```

### Privacy Preferences
```json
{
  "privacy": {
    "dataRetention": "7days|30days|90days|1year|forever",
    "shareAnalytics": true|false,
    "allowTelemetry": true|false,
    "visibleToOtherAgents": true|false,
    "exportDataAccess": true|false
  }
}
```

## Preference Management Patterns

### 1. Loading Preferences
```javascript
async function loadUserPreferences(userId) {
  const prefsPath = `/prod/agent_workspace/shared/user-preferences/${userId}.json`;

  try {
    const prefs = await fs.readFile(prefsPath, 'utf8');
    return JSON.parse(prefs);
  } catch (error) {
    // Return defaults if no preferences exist
    return getDefaultPreferences();
  }
}
```

### 2. Updating Preferences
```javascript
async function updateUserPreference(userId, path, value) {
  const prefs = await loadUserPreferences(userId);

  // Update nested preference using path notation
  // e.g., "communication.style" -> prefs.preferences.communication.style
  const keys = path.split('.');
  let target = prefs.preferences;

  for (let i = 0; i < keys.length - 1; i++) {
    target = target[keys[i]];
  }
  target[keys[keys.length - 1]] = value;

  prefs.lastUpdated = new Date().toISOString();

  await saveUserPreferences(userId, prefs);
  return prefs;
}
```

### 3. Preference Validation
```javascript
const PreferenceValidation = {
  communication: {
    style: ['professional', 'casual', 'technical', 'friendly'],
    verbosity: ['concise', 'balanced', 'detailed'],
    tone: ['formal', 'approachable', 'enthusiastic']
  },
  workflow: {
    defaultPriority: ['P0', 'P1', 'P2', 'P3', 'P5', 'P8']
  },
  ui: {
    theme: ['light', 'dark', 'auto'],
    density: ['compact', 'comfortable', 'spacious']
  }
};

function validatePreference(category, field, value) {
  const allowedValues = PreferenceValidation[category]?.[field];
  if (allowedValues && !allowedValues.includes(value)) {
    throw new Error(`Invalid ${field}: must be one of ${allowedValues.join(', ')}`);
  }
  return true;
}
```

## Default Preferences

### Conservative Defaults
```json
{
  "preferences": {
    "communication": {
      "style": "professional",
      "verbosity": "balanced",
      "tone": "approachable",
      "emojiUsage": "minimal",
      "notificationPreference": "batched"
    },
    "workflow": {
      "defaultPriority": "P2",
      "autoTaskCreation": false,
      "delegationStyle": "suggested",
      "taskGrouping": "priority"
    },
    "ui": {
      "theme": "auto",
      "density": "comfortable",
      "defaultView": "feed",
      "animations": true
    },
    "privacy": {
      "dataRetention": "90days",
      "shareAnalytics": true,
      "allowTelemetry": true
    }
  }
}
```

## Personalization Strategies

### 1. Adaptive Communication
Adjust agent responses based on user's communication preferences:

```javascript
function formatResponse(content, userPrefs) {
  const { style, verbosity, emojiUsage } = userPrefs.communication;

  if (style === 'technical') {
    // Add technical details, reduce conversational elements
    content = enhanceTechnicalDetail(content);
  }

  if (verbosity === 'concise') {
    // Reduce explanation length, focus on key points
    content = summarizeContent(content);
  }

  if (emojiUsage === 'never') {
    // Remove all emojis from content
    content = stripEmojis(content);
  }

  return content;
}
```

### 2. Context-Aware Delegation
Route tasks based on user workflow preferences:

```javascript
function shouldAutoDelegate(task, userPrefs) {
  const { delegationStyle, autoTaskCreation } = userPrefs.workflow;

  if (delegationStyle === 'automatic' && autoTaskCreation) {
    return true;
  }

  if (delegationStyle === 'suggested') {
    // Suggest delegation but wait for confirmation
    return 'suggest';
  }

  return false;
}
```

### 3. UI Customization
Apply UI preferences to agent pages:

```javascript
function applyUIPreferences(pageConfig, userPrefs) {
  const { theme, density, fontScale } = userPrefs.ui;

  return {
    ...pageConfig,
    theme,
    density,
    styles: {
      fontSize: `${fontScale}rem`,
      ...pageConfig.styles
    }
  };
}
```

## Cross-Agent Preference Sharing

### Preference Scopes
- **Global**: Applies to all agents (communication, UI)
- **Agent-Specific**: Overrides for individual agents
- **Context-Specific**: Temporary overrides for specific tasks

### Preference Inheritance
```javascript
function getEffectivePreferences(userId, agentId, context = {}) {
  const globalPrefs = await loadUserPreferences(userId);
  const agentPrefs = globalPrefs.preferences.agents[agentId] || {};
  const contextPrefs = context.preferences || {};

  // Merge with precedence: context > agent > global
  return {
    ...globalPrefs.preferences,
    ...agentPrefs,
    ...contextPrefs
  };
}
```

## Privacy & Security

### Data Protection
- Store preferences in user-specific directories
- Encrypt sensitive preference data
- Respect data retention settings
- Implement preference export/import

### Access Control
```javascript
async function canAccessPreferences(requesterId, targetUserId) {
  // Only allow:
  // 1. User accessing their own preferences
  // 2. Λvi coordinating on behalf of user
  // 3. Agents with explicit permission

  if (requesterId === targetUserId) return true;
  if (requesterId === 'avi-main') return true;

  const userPrefs = await loadUserPreferences(targetUserId);
  return userPrefs.privacy.visibleToOtherAgents;
}
```

## Migration & Versioning

### Version Migration
```javascript
async function migratePreferences(oldPrefs, fromVersion, toVersion) {
  if (fromVersion === '1.0.0' && toVersion === '2.0.0') {
    // Example migration
    return {
      ...oldPrefs,
      version: '2.0.0',
      preferences: {
        ...oldPrefs.preferences,
        newFeature: getDefaultNewFeature()
      }
    };
  }
  return oldPrefs;
}
```

## Integration Examples

### Example 1: Personal Todos Agent
```javascript
async function createTask(userId, taskData) {
  const prefs = await loadUserPreferences(userId);
  const agentPrefs = prefs.preferences.agents['personal-todos-agent'];

  return {
    ...taskData,
    priority: taskData.priority || agentPrefs.defaultPriority,
    sortBy: agentPrefs.sortBy,
    autoArchive: agentPrefs.autoArchive
  };
}
```

### Example 2: Meeting Prep Agent
```javascript
async function createMeeting(userId, meetingData) {
  const prefs = await loadUserPreferences(userId);
  const agentPrefs = prefs.preferences.agents['meeting-prep-agent'];

  return {
    ...meetingData,
    duration: meetingData.duration || agentPrefs.defaultDuration,
    reminderMinutes: agentPrefs.reminderMinutes,
    includeAgenda: agentPrefs.includeAgenda
  };
}
```

## Best Practices

1. **Progressive Enhancement**: Start with defaults, layer in preferences
2. **Graceful Degradation**: Handle missing preferences gracefully
3. **Explicit Overrides**: Allow temporary preference overrides
4. **Privacy First**: Respect privacy settings in all operations
5. **Validation**: Always validate preference values
6. **Documentation**: Document all preference options
7. **Migration Path**: Plan for preference schema evolution

## Storage Location

**User Preferences Directory:**
`/prod/agent_workspace/shared/user-preferences/`

**File Structure:**
```
/prod/agent_workspace/shared/user-preferences/
├── user-123.json
├── user-456.json
└── defaults.json
```

## Learning Integration (ReasoningBank)

This skill is learning-enabled through ReasoningBank SAFLA integration.

### What This Skill Learns

- **Pattern Recognition**: User behavior patterns that predict preferences, communication style effectiveness, workflow optimization preferences, UI/UX adaptation success
- **Success Criteria**: User satisfaction with personalized experience >4/5, reduced preference override frequency, increased feature adoption when well-matched
- **Confidence Growth**: Preference predictions gain confidence when user consistently confirms or adopts suggested preferences

### Learning Workflow

1. **Before Execution**: Query ReasoningBank for relevant patterns
   - Namespace: `user-preferences`
   - Context: User role, work patterns, historical choices, similar user profiles
   - Top 5 most confident preference prediction patterns retrieved

2. **During Execution**: Apply learned patterns to enhance personalization
   - Predict unset preferences based on similar user behaviors
   - Suggest preference changes when patterns indicate better alternatives
   - Adapt UI/workflow without explicit configuration when patterns are highly confident

3. **After Execution**: Record outcome and update confidence
   - Success (user confirms suggestion, satisfaction improves) → +20% confidence boost
   - Failure (user rejects suggestion, reverts change) → -15% confidence reduction
   - Store new patterns from unique user configurations that prove successful

### Example: Learning in Action

**Before Learning (Week 1):**
```javascript
New User: Software engineer, morning person
Default Preferences Applied:
  - Communication style: "professional"
  - Notification timing: "batched" (every 2 hours)
  - Working hours: 9 AM - 5 PM

User Adjustments:
  - Changed communication to "technical"
  - Changed notifications to "immediate"
  - Changed working hours to 7 AM - 3 PM

Satisfaction: 2/5 ("Too many irrelevant defaults")
```

**After Learning (Week 8):**
```javascript
New User: Software engineer, morning person (similar profile)
Learned Pattern: "SW engineers prefer technical style + immediate notifications (confidence: 0.87)"
Predicted Preferences:
  - Communication style: "technical" (based on role pattern)
  - Notification timing: "immediate" (based on role pattern)
  - Working hours: 7 AM - 3 PM (based on "morning person" indicator)
  - Task grouping: "context" not "priority" (learned from 12 similar engineers)

User Adjustments: None needed (all predictions accurate)
Satisfaction: 4.5/5 ("Felt personalized from day one")
Result: Pattern confidence → 0.92
```

**Real-World Impact:**
- Week 1: 68% of new users modify default preferences
- Week 8: 15% of new users modify defaults (85% accuracy on predictions)
- Learned that "morning people" consistently prefer early notifications (6-8 AM)
- Discovered technical communicators prefer concise agent responses (verbosity: "concise")
- Found that users who enable focus mode work better with 90-min time blocks vs 60-min

### Pattern Storage Schema

```json
{
  "id": "pattern-pref-sw-engineer-profile",
  "content": "Software engineers prefer technical communication style, immediate notifications, context-based task grouping, and concise verbosity",
  "namespace": "user-preferences",
  "confidence": 0.87,
  "context": {
    "userRole": "software-engineer",
    "preferenceSet": {
      "communication.style": "technical",
      "communication.verbosity": "concise",
      "workflow.notificationPreference": "immediate",
      "workflow.taskGrouping": "context",
      "ui.density": "compact"
    },
    "predictorSignals": ["job-title", "work-patterns", "tool-preferences"],
    "accuracyByPreference": {
      "communication.style": 0.94,
      "communication.verbosity": 0.82,
      "workflow.notificationPreference": 0.79,
      "workflow.taskGrouping": 0.91
    }
  },
  "outcomes": {
    "success_count": 23,
    "failure_count": 4,
    "last_outcome": "success",
    "avg_user_satisfaction": 4.4,
    "override_rate": 0.15
  }
}
```

### Integration Code Example

```typescript
// Example showing how this skill queries and learns
import { reasoningBankService } from '@/services/safla-service';

async function predictUserPreferences(
  userId: string,
  userSignals: {
    role?: string,
    timezone?: string,
    workPatterns?: string[],
    similarUsers?: string[]
  }
) {
  // 1. Query learned patterns
  const queryContext = `user role ${userSignals.role} work patterns ${userSignals.workPatterns?.join(' ')}`;
  const patterns = await reasoningBankService.queryPatterns(
    queryContext,
    'user-preferences',
    5
  );

  // 2. Start with default preferences
  let predictedPreferences = getDefaultPreferences();

  // 3. Apply high-confidence learned patterns
  for (const pattern of patterns.filter(p => p.confidence > 0.75)) {
    if (pattern.context.preferenceSet) {
      // Apply each preference from the pattern
      for (const [path, value] of Object.entries(pattern.context.preferenceSet)) {
        const prefAccuracy = pattern.context.accuracyByPreference?.[path];

        // Only apply if this specific preference has good accuracy
        if (!prefAccuracy || prefAccuracy > 0.75) {
          setNestedPreference(predictedPreferences, path, value);
        }
      }
    }
  }

  // 4. Generate confidence scores for predictions
  const preferenceConfidence = calculatePreferenceConfidence(
    predictedPreferences,
    patterns
  );

  // 5. Create suggestions for low-confidence predictions
  const suggestions = Object.entries(preferenceConfidence)
    .filter(([path, conf]) => conf < 0.7)
    .map(([path, conf]) => ({
      preference: path,
      currentValue: getNestedPreference(predictedPreferences, path),
      confidence: conf,
      suggestion: "Let user confirm this preference"
    }));

  return {
    preferences: predictedPreferences,
    confidence: preferenceConfidence,
    suggestions,
    learnedFrom: patterns.slice(0, 3),

    // 6. Outcome tracking
    recordPreferenceAccuracy: async (
      finalPreferences: UserPreferences,
      userSatisfaction: number
    ) => {
      // Compare predicted vs actual
      const accuracy = calculatePreferenceAccuracy(
        predictedPreferences,
        finalPreferences
      );

      const success = accuracy > 0.75 && userSatisfaction >= 4;

      for (const pattern of patterns) {
        await reasoningBankService.recordOutcome(
          pattern.id,
          success ? 'success' : 'failure',
          {
            context: {
              userId,
              userRole: userSignals.role,
              predictedPrefs: predictedPreferences,
              actualPrefs: finalPreferences,
              accuracy,
              userSatisfaction,
              overrideCount: countOverrides(predictedPreferences, finalPreferences)
            },
            executionTimeMs: 0
          }
        );
      }

      // Create new pattern if unique successful profile
      if (success && patterns.length === 0) {
        await reasoningBankService.createPattern({
          content: `${userSignals.role} users prefer: ${summarizePreferences(finalPreferences)}`,
          namespace: 'user-preferences',
          category: userSignals.role || 'general',
          metadata: {
            preferenceSet: extractKeyPreferences(finalPreferences),
            userSatisfaction
          }
        });
      }
    }
  };
}
```

## References
- User preference API: `/api/users/{userId}/preferences`
- Preference validation schema: `/schemas/user-preferences.json`
- Privacy policy: `/docs/privacy-policy.md`
