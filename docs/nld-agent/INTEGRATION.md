# NLD Agent Integration Guide

## Complete Integration with Claude-Flow Pipeline

The NLD Agent is now fully integrated into your claude-flow development pipeline. Here's how to use it:

## 🚀 Quick Start

### 1. Agent is Ready
The NLD agent is automatically available:
```bash
claude --agent nld-agent
```

### 2. Test the Integration
```bash
# Check system health
/nld-health

# View current stats  
/nld-stats

# Get help
/nld-help
```

## 📊 How It Works

### Automatic Detection
1. **You work normally** with Claude Code
2. **When things don't work**, say: "that didn't work" or "got an error"
3. **NLD automatically captures** the failure pattern
4. **Builds TDD database** for future improvements

### Manual Reporting
```bash
# Report a failure manually
/nld-report failure "implement user auth" "Here's my code..." "got 500 error"

# Report a success
/nld-report success "fixed the bug" "Updated logic..." "working perfectly"
```

## 🔧 Integration Points

### With Your Existing Workflow

**Before starting work:**
```bash
# Get TDD suggestions based on historical failures
/nld-suggest "create user registration API" backend
```

**During development:**
- Work normally with Claude Code
- NLD automatically detects your feedback patterns
- No interruption to your flow

**After completion:**
```bash
# Analyze what was learned
/nld-patterns backend 5

# Export training data for neural networks
/nld-train
```

### With SPARC TDD Workflows

```bash
# Enhanced SPARC with historical insights
/nld-suggest "implement payment processing" backend

# Then run SPARC TDD with better context
npx claude-flow sparc tdd "implement payment processing"
```

### With Claude-Flow Hooks

Your existing hooks now automatically include NLD:

```bash
# Pre-task (automatic)
npx claude-flow@alpha hooks pre-task --description "create API endpoint"

# Post-task (automatic) 
npx claude-flow@alpha hooks post-task --task-id "task-123"

# User feedback detection (automatic)
# When you say "didn't work" -> NLD activates automatically
```

## 📈 Monitoring & Analytics

### Real-Time Dashboard
```bash
# Generate comprehensive dashboard
node .claude-flow/nld/monitoring/dashboard.js generate

# Quick health check
node .claude-flow/nld/monitoring/dashboard.js health

# Current metrics
node .claude-flow/nld/monitoring/dashboard.js metrics
```

### Pattern Analysis
```bash
# Analyze failure patterns
/nld-analyze failures

# TDD effectiveness analysis
/nld-analyze tdd

# Trending patterns
/nld-analyze trends
```

## 🧠 Neural Network Integration

### Training Data Export
```bash
# Export for claude-flow neural training
/nld-train

# Check training status
node .claude-flow/nld/neural/training-data-export.js
```

### Pattern Recognition
The NLD database feeds into claude-flow's neural networks:
- **Failure prediction models**
- **TDD effectiveness scoring** 
- **Success probability estimation**
- **Pattern-based test suggestions**

## 📁 File Structure Created

```
.claude/agents/nld-agent.md              # ✅ Agent configuration
.claude-flow/nld/
├── database/
│   ├── schema.json                      # ✅ NLT database schema
│   ├── records/                         # ✅ Individual failure/success records
│   └── index.json                       # ✅ Search indexes
├── hooks/
│   ├── detection-triggers.js            # ✅ Auto-detection logic  
│   ├── auto-trigger.js                  # ✅ Claude-flow hook integration
│   └── slash-commands.js                # ✅ /nld-* command handlers
├── neural/
│   ├── training-data-export.js          # ✅ Neural network data export
│   ├── exports/                         # ✅ Training data files
│   └── nld-patterns.json               # ✅ Pattern definitions
├── patterns/
│   └── pattern-analyzer.js             # ✅ Pattern analysis engine
├── workflows/
│   └── tdd-enhancement.js              # ✅ TDD suggestion engine
├── monitoring/
│   └── dashboard.js                     # ✅ Metrics and monitoring
├── logs/                               # ✅ Activity logs
├── metrics/                            # ✅ Performance metrics
└── sessions/                           # ✅ Session context
docs/nld-agent/
├── README.md                           # ✅ Complete user guide
└── INTEGRATION.md                      # ✅ This integration guide
```

## 🎯 Usage Examples

### Example 1: API Development
```bash
User: "Create a user registration endpoint"
Claude: [Creates endpoint code]
User: "that didn't work - getting validation errors"

# NLD automatically:
# ✅ Records failure pattern
# ✅ Classifies as 'logic' failure in 'backend' domain  
# ✅ Updates statistics
# ✅ Prepares neural training data

# Later:
/nld-suggest "create user login endpoint" backend
# Returns: High probability suggestions based on registration endpoint failures
```

### Example 2: Frontend Component
```bash
# Before starting
/nld-suggest "responsive navigation component" frontend

# Output:
# Success Probability: 68% (medium confidence)
# Recommended Tests: 
# - Component rendering tests
# - Responsive breakpoint tests  
# - Keyboard navigation tests
# Common Pitfalls:
# - CSS breakpoint issues (historically 34% of failures)
# - Accessibility problems (28% of failures)
```

### Example 3: Debugging Session
```bash
User: "Fix this API that's returning 500 errors"
Claude: [Provides debugging solution]
User: "still not working - different error now"
Claude: [Provides updated solution] 
User: "that worked! Thanks"

# NLD captures:
# ✅ Initial failure pattern
# ✅ Iterative debugging process
# ✅ Final success pattern
# ✅ Time-to-resolution metrics
```

## 🔍 Advanced Features

### Pattern-Based TDD Suggestions
```bash
/nld-suggest "implement caching layer" backend

# Returns historically-informed suggestions:
# - Cache invalidation tests (90% of cache failures involve this)
# - Memory leak detection tests (67% improvement with monitoring)
# - Concurrent access tests (45% of cache bugs are race conditions)
```

### Domain-Specific Analysis
```bash
# Frontend patterns
/nld-patterns frontend 10

# Backend patterns
/nld-patterns backend 10

# Debug-specific patterns
/nld-patterns debug 5
```

### Predictive Analytics
```bash
/nld-analyze trends

# Shows:
# - Failure rate trends over time
# - TDD adoption correlation with success
# - Emerging failure patterns
# - Success probability predictions
```

## 🛠️ Configuration Options

### Environment Variables
```bash
# Enable user notifications (optional)
export NLD_NOTIFY_USER=true

# Session tracking
export CLAUDE_SESSION_ID=your-session-id

# Silent mode (default)
export NLD_SILENT_MODE=true
```

### Claude-Flow Config
```json
{
  "nld": {
    "auto_detection": true,
    "neural_training": true, 
    "tdd_suggestions": true,
    "pattern_analysis": true,
    "notification_level": "minimal"
  }
}
```

## 📊 Success Metrics

After integration, you should see:
- **Reduced repeated failures** of the same type
- **Improved TDD adoption** through historical insights
- **Better test coverage** via pattern-based suggestions
- **Faster problem resolution** through predictive analytics

## 🔧 Troubleshooting

### Common Setup Issues

**"Command not found" for /nld-* commands:**
```bash
# Check if agent is properly installed
ls -la .claude/agents/nld-agent.md

# Verify script permissions
chmod +x .claude-flow/nld/hooks/*.js
```

**"No patterns detected":**
```bash
# Check detection triggers
node .claude-flow/nld/hooks/detection-triggers.js "didn't work" "test response"

# Verify database setup
/nld-health
```

**"Database empty":**
- Use manual reporting: `/nld-report failure "task" "solution" "feedback"`
- Ensure trigger words: "didn't work", "that worked", "failed", "broken"

### Debug Commands
```bash
# Test pattern detection
node .claude-flow/nld/hooks/detection-triggers.js "that failed" "solution text"

# Check database health
node .claude-flow/nld/hooks/slash-commands.js nld-health

# Analyze patterns directly
node .claude-flow/nld/patterns/pattern-analyzer.js

# Export training data
node .claude-flow/nld/neural/training-data-export.js
```

## 🚀 Next Steps

1. **Start using it**: Work normally, NLD learns automatically
2. **Check stats weekly**: `/nld-stats` to see progress
3. **Use TDD suggestions**: `/nld-suggest` before complex tasks
4. **Export training data**: `/nld-train` for neural network improvements
5. **Analyze trends**: `/nld-analyze trends` for team insights

## 📞 Support

- **Health Checks**: `/nld-health` for system status
- **Documentation**: Check `docs/nld-agent/README.md`  
- **Debugging**: Use `/nld-help` for command reference

---

The NLD Agent now seamlessly integrates with your development workflow, automatically learning from failures and successes to improve future TDD practices. Every interaction makes the system smarter!