#!/bin/bash

# 🔍 Quick Page Not Found Debug Runner
# Runs comprehensive browser automation debugging

echo "🔍 Starting Page Not Found Debug Suite..."
echo "📍 Target URL: http://localhost:5173/agents/personal-todos-agent/pages/015b7296-a144-4096-9c60-ee5d7f900723"
echo ""

# Check if servers are running
echo "🔧 Checking server status..."
if ! curl -s http://localhost:5173 > /dev/null; then
    echo "❌ Frontend server not running on :5173"
    exit 1
fi

if ! curl -s http://localhost:3000/api/health > /dev/null; then
    echo "❌ Backend server not running on :3000"
    exit 1
fi

echo "✅ Servers are running"
echo ""

# Run the debug script
echo "🚀 Running browser automation debug..."
cd /workspaces/agent-feed/frontend
node tests/debug-page-not-found.js

echo ""
echo "📊 Debug Results:"
echo "- Screenshot: tests/debug-page-not-found.png"
echo "- Page HTML: tests/debug-page-source.html"
echo "- Full Report: tests/debug-report.json"
echo "- Analysis: tests/CRITICAL_BUG_ANALYSIS_REPORT.md"
echo ""

# Show key findings
if [ -f "tests/debug-report.json" ]; then
    echo "🔍 Key Findings:"
    echo "$(cat tests/debug-report.json | jq -r '.status | to_entries[] | "- \(.key): \(.value)"')"
    echo ""
    echo "📈 Metrics:"
    echo "$(cat tests/debug-report.json | jq -r '.counts | to_entries[] | "- \(.key): \(.value)"')"
fi

echo ""
echo "✅ Debug complete! Check the reports above for detailed analysis."