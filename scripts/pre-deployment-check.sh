#!/bin/bash
# Pre-deployment checklist wrapper script
# This provides a convenient way to run the TypeScript checklist

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

echo "Running pre-deployment checklist..."
echo ""

# Run with tsx
npx tsx "$SCRIPT_DIR/pre-deployment-checklist.ts" "$@"
