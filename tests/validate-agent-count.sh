#!/bin/bash

# Quick validation script to verify agent count

echo "🔍 Agent Filtering Validation"
echo "=============================="
echo ""

# Check filesystem
AGENT_DIR="/workspaces/agent-feed/prod/.claude/agents"
if [ -d "$AGENT_DIR" ]; then
    AGENT_COUNT=$(ls -1 "$AGENT_DIR"/*.md 2>/dev/null | wc -l)
    echo "✅ Production agents directory exists"
    echo "📂 Location: $AGENT_DIR"
    echo "📊 Agent count: $AGENT_COUNT"
    echo ""

    if [ "$AGENT_COUNT" -eq 13 ]; then
        echo "✅ PASS: Exactly 13 production agents found"
    else
        echo "❌ FAIL: Expected 13 agents, found $AGENT_COUNT"
        exit 1
    fi

    echo ""
    echo "Production agents:"
    ls -1 "$AGENT_DIR"/*.md | xargs -n1 basename | sed 's/^/  - /'
else
    echo "❌ FAIL: Production agents directory not found"
    exit 1
fi

echo ""
echo "=============================="
echo "✅ Validation Complete"
echo ""
echo "Next steps:"
echo "  1. Run unit tests: npm test -- tests/unit/filesystem-agent-repository.test.js"
echo "  2. View report: cat tests/reports/AGENT-FILTERING-TEST-REPORT.md"
echo "  3. Run all tests: ./tests/run-agent-filtering-tests.sh"
