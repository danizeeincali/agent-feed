# NLD Agent - Neuro-Learning Development Agent

## Overview

The NLD (Neuro-Learning Development) Agent is a specialized claude-flow agent that automatically captures failure patterns when Claude claims success but users report actual failure, building a comprehensive database for TDD improvement.

## Features

### 🔍 Automatic Pattern Detection
- Activates on user feedback: "didn't work", "that worked", etc.
- Captures Claude's solutions vs actual outcomes
- Records failure types and context automatically

### 🧠 Neural Network Integration
- Exports training data for claude-flow neural networks
- Provides pattern analysis for failure prediction
- Enhances TDD suggestions with historical data

### 📊 TDD Enhancement
- Suggests test patterns based on historical failures
- Provides TDD workflows optimized for task domain
- Calculates success probability for different approaches

### 📈 Pattern Analysis
- Analyzes failure trends over time
- Identifies recurring failure modes
- Tracks TDD effectiveness by domain

## Quick Start

### 1. Agent Installation
The NLD agent is automatically available in your claude-flow pipeline:

```bash
# Use the agent directly
claude --agent nld-agent

# Or trigger specific functions
/nld-suggest "implement user authentication"
```

### 2. Automatic Detection
NLD automatically activates when users provide feedback:

```
User: "that didn't work - got a 500 error"
🧠 NLD: Captured unexpected_failure pattern (Record: nlt-1634567890-abc123)
```

### 3. Manual Reporting
Report patterns manually using slash commands:

```bash
/nld-report failure "create login function" "Here's the code..." "authentication failed"
```

## Available Commands

### `/nld-suggest "<task>" [domain]`
Get TDD suggestions based on historical failure patterns:

```bash
/nld-suggest "implement user registration" backend
```

**Output:**
- Success probability prediction
- Recommended test patterns  
- Common pitfalls to avoid
- TDD workflow suggestions

### `/nld-stats [domain]`
View database statistics:

```bash
/nld-stats backend
```

**Output:**
- Total records and failure rates
- TDD adoption rates
- Data quality metrics
- Top failure types

### `/nld-patterns [domain] [limit]`
Analyze failure patterns:

```bash
/nld-patterns debug 10
```

**Output:**
- Most common failure patterns
- Trending failure types
- Pattern frequency analysis
- Recommendations for improvement

### `/nld-analyze [type]`
Run comprehensive analysis:

```bash
/nld-analyze tdd
# Types: failures, successes, tdd, trends, overview
```

### `/nld-train`
Export neural network training data:

```bash
/nld-train
```

### `/nld-health`
Check system health:

```bash
/nld-health
```

## Integration with Claude-Flow

### Automatic Hooks
NLD integrates with your existing claude-flow hooks:

```bash
# Pre-task hook
npx claude-flow@alpha hooks pre-task --description "implement feature X"

# User feedback detection (automatic)
# When user says "didn't work" -> NLD activates

# Post-task metrics
npx claude-flow@alpha hooks post-task --task-id "task-123"
```

### Neural Network Training
Export data for claude-flow neural training:

```bash
# Manual export
/nld-train

# Automatic integration
npx claude-flow@alpha neural-train pattern_type="failure_detection" training_data="nld_export"
```

### SPARC Integration
Use NLD with SPARC TDD workflows:

```bash
# Get TDD suggestions before starting
/nld-suggest "create user service" backend

# Run SPARC TDD with historical insights
npx claude-flow sparc tdd "create user service"
```

## Database Schema

NLD stores structured records in the NLT (Neuro-Learning Testing) format:

```json
{
  "record_id": "nlt-1634567890-abc123",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "task_context": {
    "original_task": "implement user login",
    "task_domain": "backend",
    "claude_solution": "Here's the login code...",
    "claude_confidence": 0.8
  },
  "user_feedback": {
    "outcome": "failure",
    "feedback_text": "that didn't work - 500 error",
    "corrected_solution": "Fixed version..."
  },
  "failure_analysis": {
    "failure_type": "logic",
    "tdd_used": false,
    "test_coverage": 0
  },
  "effectiveness_metrics": {
    "effectiveness_score": 0.3,
    "tdd_factor": 1.0
  }
}
```

## File Structure

```
.claude/agents/nld-agent.md          # Agent configuration
.claude-flow/nld/
├── database/
│   ├── schema.json                  # Database schema
│   ├── records/                     # Individual NLT records
│   └── index.json                   # Search indexes
├── hooks/
│   ├── detection-triggers.js        # Auto-detection logic
│   ├── auto-trigger.js             # Hook integrations
│   └── slash-commands.js            # Command implementations
├── neural/
│   ├── training-data-export.js      # Neural network exports
│   ├── exports/                     # Exported training data
│   └── nld-patterns.json           # Pattern definitions
├── patterns/
│   └── pattern-analyzer.js         # Pattern analysis engine
├── workflows/
│   └── tdd-enhancement.js          # TDD suggestion engine
├── logs/                           # Activity logs
├── metrics/                        # Session metrics
└── sessions/                       # Session context
```

## Usage Examples

### Example 1: Frontend Component Development
```bash
# Get suggestions for component creation
/nld-suggest "create responsive navigation component" frontend

# Output includes:
# - Success probability: 75% (medium confidence)
# - Recommended tests: Component rendering, responsive behavior, accessibility
# - Common pitfalls: CSS breakpoint issues, keyboard navigation
# - TDD workflow: 30-45 minute estimated completion
```

### Example 2: Backend API Development
```bash
# Analyze backend failure patterns
/nld-patterns backend 5

# Output shows:
# - Top failures: integration (32%), dependency (28%), logic (25%)
# - Trending: authentication errors increasing
# - Recommendation: Implement auth validation tests first
```

### Example 3: Debugging Session
```bash
# User workflow:
User: "Can you fix this API endpoint that's returning 500 errors?"
Claude: [Provides solution]
User: "that didn't work, still getting errors"

# NLD automatically:
# ✅ Detects failure pattern
# ✅ Records debugging context
# ✅ Updates failure statistics
# ✅ Prepares training data

# Later check what was learned:
/nld-analyze failures
```

## Configuration

### Environment Variables
```bash
# Enable user notifications (optional)
export NLD_NOTIFY_USER=true

# Set session ID for tracking
export CLAUDE_SESSION_ID=session-123

# Configure silent operation (default)
export NLD_SILENT_MODE=true
```

### Integration Settings
```json
// .claude-flow/config.json
{
  "nld": {
    "auto_detection": true,
    "neural_training": true,
    "tdd_suggestions": true,
    "pattern_analysis": true
  }
}
```

## Monitoring & Analytics

### Health Monitoring
```bash
/nld-health
```

Check:
- Database integrity
- Neural integration status  
- Pattern detection functionality
- Training data exports

### Analytics Dashboard
```bash
/nld-stats
```

Key metrics:
- Total failure/success patterns captured
- TDD adoption rates by domain
- Effectiveness score trends
- Data quality indicators

### Performance Tracking
- Pattern detection latency
- Training data export frequency
- Neural network integration status
- Session context preservation

## Best Practices

### For Users
1. **Provide Clear Feedback**: Use "didn't work" or "that worked" for best detection
2. **Include Context**: Mention error messages or specific issues
3. **Use Manual Reporting**: For edge cases, use `/nld-report` command
4. **Review Suggestions**: Check `/nld-suggest` before complex tasks

### For Teams
1. **Regular Analysis**: Run `/nld-analyze` weekly to identify trends
2. **TDD Training**: Use historical patterns for TDD training sessions
3. **Domain Focus**: Track patterns by domain (frontend, backend, etc.)
4. **Neural Training**: Export training data regularly for ML improvements

## Troubleshooting

### Common Issues

**No patterns detected:**
- Check that user feedback contains trigger words
- Verify `.claude-flow/nld/` directory structure
- Run `/nld-health` to check system status

**Missing suggestions:**
- Ensure sufficient historical data exists
- Check domain-specific records with `/nld-stats <domain>`
- Verify database index integrity

**Training export failures:**
- Check disk space in `.claude-flow/nld/neural/exports/`
- Verify record format consistency
- Run pattern analysis first: `/nld-analyze`

### Debug Commands
```bash
# Test detection manually
node .claude-flow/nld/hooks/detection-triggers.js "didn't work" "solution text"

# Analyze patterns directly
node .claude-flow/nld/patterns/pattern-analyzer.js

# Check database health
node .claude-flow/nld/hooks/slash-commands.js nld-health
```

## Contributing

The NLD agent is designed to be extensible. Key areas for enhancement:

1. **Pattern Recognition**: Improve detection algorithms
2. **Neural Integration**: Enhance claude-flow ML integration  
3. **TDD Workflows**: Add domain-specific TDD patterns
4. **Analytics**: Expand pattern analysis capabilities

## Support

- **Documentation**: Check this README for usage questions
- **Issues**: File bugs via your development team
- **Feature Requests**: Use `/nld-suggest` for new capabilities
- **Health Checks**: Regular `/nld-health` monitoring recommended

---

The NLD Agent transforms failure patterns into learning opportunities, making every coding session contribute to improved development practices. By automatically capturing what doesn't work and learning from it, we build better TDD practices and more reliable solutions over time.