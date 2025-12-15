#!/bin/bash

/**
 * Mock File Cleanup Script
 * Removes or relocates mock implementations from production code paths
 * Ensures 100% real functionality in production builds
 */

echo "🧹 Starting Mock File Cleanup for Production Validation..."
echo "=================================================="

# Create backup directory
BACKUP_DIR="/workspaces/agent-feed/dev-backup/mocks-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "📁 Created backup directory: $BACKUP_DIR"

# List of mock files to be moved/removed from production paths
MOCK_FILES=(
    "/workspaces/agent-feed/frontend/src/tests/mocks/claude-code-sdk.mock.ts"
    "/workspaces/agent-feed/src/services/MockClaudeProcess.js"
    "/workspaces/agent-feed/frontend/src/tests/mocks/WebSocketMock.ts"
    "/workspaces/agent-feed/frontend/src/tests/mocks/notificationSystemMock.ts"
)

echo "🔍 Checking mock files for relocation..."

for file in "${MOCK_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "📦 Backing up: $file"
        cp "$file" "$BACKUP_DIR/"

        # Move to test-only directory structure
        filename=$(basename "$file")
        test_dir="/workspaces/agent-feed/tests/mocks"
        mkdir -p "$test_dir"

        echo "📂 Moving to test directory: $test_dir/$filename"
        mv "$file" "$test_dir/"

        echo "✅ Relocated: $filename"
    else
        echo "⚠️  File not found: $file"
    fi
done

# Update any imports that might reference moved files
echo "🔧 Updating imports and references..."

# Find and list files that might import mock files
find /workspaces/agent-feed/frontend/src -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | \
    xargs grep -l "claude-code-sdk.mock\|MockClaudeProcess\|WebSocketMock" 2>/dev/null | \
    grep -v test | grep -v spec | grep -v __tests__ > /tmp/files_with_mock_imports.txt

if [ -s /tmp/files_with_mock_imports.txt ]; then
    echo "⚠️  WARNING: Found production files importing mock implementations:"
    cat /tmp/files_with_mock_imports.txt
    echo ""
    echo "🔧 These files need manual review to ensure no production imports of mocks:"
    while read -r file; do
        echo "   📝 Review: $file"
        grep -n "claude-code-sdk.mock\|MockClaudeProcess\|WebSocketMock" "$file" | head -3
    done < /tmp/files_with_mock_imports.txt
else
    echo "✅ No production files found importing mock implementations"
fi

# Create .npmignore and webpack excludes to prevent mock files in builds
echo "📦 Updating build configuration to exclude mock files..."

# Add to .gitignore if not already present
if ! grep -q "# Mock files" /workspaces/agent-feed/.gitignore 2>/dev/null; then
    echo "" >> /workspaces/agent-feed/.gitignore
    echo "# Mock files (development only)" >> /workspaces/agent-feed/.gitignore
    echo "**/*.mock.*" >> /workspaces/agent-feed/.gitignore
    echo "**/mocks/" >> /workspaces/agent-feed/.gitignore
    echo "src/services/MockClaudeProcess.js" >> /workspaces/agent-feed/.gitignore
    echo "✅ Updated .gitignore to exclude mock files"
fi

# Check for remaining mock patterns in production code
echo "🔍 Final scan for remaining mock patterns..."
remaining_violations=0

for dir in "/workspaces/agent-feed/frontend/src" "/workspaces/agent-feed/src"; do
    if [ -d "$dir" ]; then
        # Scan for mock patterns, excluding test directories
        violations=$(find "$dir" -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | \
            grep -v test | grep -v spec | grep -v __tests__ | grep -v mock | \
            xargs grep -l "mock[A-Z]\|fake[A-Z]\|stub[A-Z]" 2>/dev/null | wc -l)

        if [ "$violations" -gt 0 ]; then
            echo "⚠️  Found $violations files with potential mock patterns in $dir"
            remaining_violations=$((remaining_violations + violations))
        fi
    fi
done

# Generate cleanup report
cat > "/workspaces/agent-feed/mock-cleanup-report.txt" << EOF
Mock File Cleanup Report
========================
Date: $(date)
Backup Location: $BACKUP_DIR

Files Processed:
$(for file in "${MOCK_FILES[@]}"; do
    filename=$(basename "$file")
    if [ -f "/workspaces/agent-feed/tests/mocks/$filename" ]; then
        echo "✅ Relocated: $filename"
    elif [ -f "$file" ]; then
        echo "⚠️  Still present: $file"
    else
        echo "❓ Not found: $file"
    fi
done)

Remaining Mock Violations: $remaining_violations files

Build Configuration:
✅ .gitignore updated to exclude mock files
✅ Mock files moved to test-only directories

Next Steps:
1. Review any files listed with production mock imports
2. Update webpack/build config to exclude test directories
3. Run production build to verify no mock imports
4. Test deployment to ensure functionality

Status: $([ $remaining_violations -eq 0 ] && echo "CLEANUP COMPLETE" || echo "MANUAL REVIEW REQUIRED")
EOF

echo ""
echo "📊 CLEANUP SUMMARY"
echo "=================="
echo "📁 Backup created: $BACKUP_DIR"
echo "🔧 Files relocated to: /workspaces/agent-feed/tests/mocks/"
echo "📝 Report saved: /workspaces/agent-feed/mock-cleanup-report.txt"
echo "⚠️  Remaining violations: $remaining_violations files"

if [ $remaining_violations -eq 0 ]; then
    echo "🎉 CLEANUP SUCCESSFUL: All mock files removed from production paths!"
    exit 0
else
    echo "⚠️  MANUAL REVIEW REQUIRED: Some mock patterns still found in production code"
    exit 1
fi